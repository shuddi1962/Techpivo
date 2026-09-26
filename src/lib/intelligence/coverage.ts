import { createClient } from "@/lib/supabase/admin";
import { titleOverlaps } from "@/lib/duplicate-check";
import { TOOL_REGISTRY } from "@/lib/tools-registry";

export type CoverageLevel = "exact" | "partial" | "related" | "none";

export interface CoverageMatch {
  kind: "post" | "tool" | "keyword_article";
  title: string;
  ref: string;
  status: string;
}

export interface CoverageResult {
  level: CoverageLevel;
  matches: CoverageMatch[];
}

/**
 * TechPivo existing-content matcher. Searches posts, tools, and keyword
 * articles for a candidate keyword BEFORE recommending a new article, so we
 * recommend UPDATE / EXPAND instead of duplicating coverage.
 * Read-only; uses the service client to see drafts/scheduled too.
 */
export async function checkTechPivoCoverage(keyword: string): Promise<CoverageResult> {
  const matches: CoverageMatch[] = [];
  const supabase = createClient();
  const kw = keyword.trim().toLowerCase();
  if (!kw) return { level: "none", matches };

  const { data: posts } = await supabase
    .from("posts")
    .select("title, slug, status")
    .in("status", ["published", "draft", "scheduled"])
    .limit(2000);

  let exact = false;
  let partial = false;
  for (const p of posts ?? []) {
    const title = (p.title ?? "") as string;
    if (!title) continue;
    if (title.trim().toLowerCase() === kw) {
      exact = true;
      matches.push({ kind: "post", title, ref: `/${(p.slug ?? "") as string}`, status: (p.status ?? "") as string });
    } else if (titleOverlaps(keyword, title)) {
      partial = true;
      if (matches.length < 8) {
        matches.push({ kind: "post", title, ref: `/${(p.slug ?? "") as string}`, status: (p.status ?? "") as string });
      }
    }
    if (matches.length >= 8) break;
  }

  for (const t of TOOL_REGISTRY) {
    if (titleOverlaps(keyword, t.name) || titleOverlaps(keyword, t.description)) {
      partial = true;
      if (matches.length < 10) {
        matches.push({ kind: "tool", title: t.name, ref: `/tools/${t.slug}`, status: "live" });
      }
    }
  }

  const { data: kas } = await supabase
    .from("keyword_articles")
    .select("keyword, title, status")
    .limit(500);
  for (const k of kas ?? []) {
    const kt = ((k.keyword ?? "") as string) || ((k.title ?? "") as string);
    if (kt && titleOverlaps(keyword, kt)) {
      partial = true;
      if (matches.length < 12) {
        matches.push({ kind: "keyword_article", title: (k.title ?? kt) as string, ref: (k.keyword ?? kt) as string, status: (k.status ?? "") as string });
      }
    }
  }

  if (exact) return { level: "exact", matches };
  if (partial) return { level: "partial", matches };
  // Related: any single significant word shared with a post title.
  const words = kw.split(/[^a-z0-9]+/).filter((w) => w.length > 4);
  const related = (posts ?? []).find((p) =>
    words.some((w) => ((p.title ?? "") as string).toLowerCase().includes(w))
  );
  if (related) {
    return {
      level: "related",
      matches: [
        {
          kind: "post",
          title: (related.title ?? "") as string,
          ref: `/${(related.slug ?? "") as string}`,
          status: (related.status ?? "") as string,
        },
      ],
    };
  }
  return { level: "none", matches };
}
