import { createClient } from "@/lib/supabase/admin"

export interface DuplicatePost {
  id: string
  title: string
  slug: string
  status: string
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim()
}

// Title-vs-title overlap: exact keyword inclusion (>=5 chars) or >=60% of the
// significant (>3 char) words of the topic appearing in the existing title.
// Catches "same article, different title" duplicates before the AI writes.
export function titleOverlaps(topic: string, title: string): boolean {
  const kw = normalize(topic)
  const t = normalize(title)
  if (!kw || !t) return false
  if (kw.length >= 5 && t.includes(kw)) return true
  const kwWords = kw.split(" ").filter((w) => w.length > 3)
  if (kwWords.length === 0) return false
  const hit = kwWords.filter((w) => t.includes(w)).length
  return hit / kwWords.length >= 0.6
}

// Finds an existing post (published, draft or scheduled) that already covers
// the topic. Returns null when no duplicate exists so the AI can write freely.
export async function findDuplicatePost(topic: string): Promise<DuplicatePost | null> {
  const kw = normalize(topic)
  if (!kw) return null

  const supabase = createClient()
  const { data } = await supabase
    .from("posts")
    .select("id, title, slug, status")
    .in("status", ["published", "draft", "scheduled"])
    .not("title", "is", null)
    .limit(2000)

  if (!data || data.length === 0) return null

  for (const p of data) {
    if (titleOverlaps(kw, String(p.title || ""))) {
      return {
        id: String(p.id),
        title: String(p.title),
        slug: String(p.slug || ""),
        status: String(p.status || ""),
      }
    }
  }
  return null
}