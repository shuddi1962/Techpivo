import { createClient } from "@/lib/supabase/admin";
import { TOOL_REGISTRY } from "@/lib/tools-registry";

/**
 * TechPivo Intelligence — category seed builder (SERVER-ONLY).
 * Seeds come from TechPivo's OWN database, never hardcoded lists:
 * recent post titles/tags, tool names, community questions, tracked keywords.
 */

export interface CategorySeeds {
  category: string;
  seeds: string[];
  sources: Record<string, number>;
}

const STOP = new Set(["the", "and", "for", "with", "from", "that", "this", "best", "guide", "2026", "2025", "2024", "new", "top", "how", "what", "why", "your"]);

function topicPhrases(title: string): string[] {
  const clean = title.toLowerCase().replace(/[^a-z0-9\s+.#-]/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length < 8) return [];
  const words = clean.split(" ").filter((w) => w.length > 2 && !STOP.has(w));
  if (words.length === 0) return [];
  // Full title (capped) + first 4 significant words as a short variant.
  const out = [clean.slice(0, 80)];
  if (words.length >= 4) out.push(words.slice(0, 4).join(" "));
  return out;
}

/** Build discovery seeds for a category from live TechPivo content. */
export async function buildCategorySeeds(category: string, maxSeeds = 12): Promise<CategorySeeds> {
  const supabase = createClient();
  const seen = new Map<string, number>();
  const sources: Record<string, number> = {};
  const add = (phrase: string, source: string) => {
    const key = phrase.trim().toLowerCase();
    if (key.length < 4 || key.length > 80 || seen.has(key)) return;
    seen.set(key, 1);
    sources[source] = (sources[source] ?? 0) + 1;
  };

  // Category slug match: categories table slug or name.
  const { data: cats } = await supabase.from("categories").select("id, slug, name").limit(100);
  const cat = (cats ?? []).find(
    (c) => ((c.slug ?? "") as string).toLowerCase() === category.toLowerCase() ||
      ((c.name ?? "") as string).toLowerCase() === category.toLowerCase()
  );
  const categoryId = (cat?.id ?? null) as string | null;

  let postQuery = supabase
    .from("posts")
    .select("title, tags, category_id")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(300);
  if (categoryId) postQuery = postQuery.eq("category_id", categoryId);
  const { data: posts } = await postQuery;
  for (const p of posts ?? []) {
    for (const ph of topicPhrases((p.title ?? "") as string)) add(ph, "posts");
    const tags = (p.tags ?? []) as string[];
    for (const t of tags.slice(0, 4)) add(t, "post_tags");
    if (seen.size >= maxSeeds * 3) break;
  }

  for (const t of TOOL_REGISTRY) {
    if (category && !`${t.name} ${t.description} ${t.category}`.toLowerCase().includes(category.toLowerCase().split(" ")[0])) continue;
    add(t.name.toLowerCase(), "tools");
    if (seen.size >= maxSeeds * 3) break;
  }

  const { data: forum } = await supabase
    .from("forum_posts")
    .select("title")
    .order("created_at", { ascending: false })
    .limit(200);
  for (const f of forum ?? []) {
    for (const ph of topicPhrases((f.title ?? "") as string)) add(ph, "community");
    if (seen.size >= maxSeeds * 4) break;
  }

  const { data: tracked } = await supabase
    .from("keyword_snapshots")
    .select("keyword")
    .order("fetched_at", { ascending: false })
    .limit(200);
  for (const k of tracked ?? []) {
    add(((k.keyword ?? "") as string).toLowerCase(), "tracked");
    if (seen.size >= maxSeeds * 4) break;
  }

  return { category, seeds: [...seen.keys()].slice(0, maxSeeds), sources };
}

/** Depth caps keep discovery spend predictable. */
export function depthCaps(depth: "broad" | "standard" | "deep"): { seeds: number; markets: number; suggestionsPerSeed: number } {
  if (depth === "broad") return { seeds: 4, markets: 2, suggestionsPerSeed: 10 };
  if (depth === "deep") return { seeds: 10, markets: 4, suggestionsPerSeed: 20 };
  return { seeds: 6, markets: 3, suggestionsPerSeed: 12 };
}
