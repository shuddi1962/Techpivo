import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const TRENDS_URLS = [
  "https://trends.google.com/trending/rss?geo=US",
  "https://trends.google.com/trending/rss?geo=US&category=tech",
  "https://trends.google.com/trends/trendingsearches/daily/rss?geo=US",
]

function parseTrendsRSS(xml: string): Array<{ keyword: string; traffic: string }> {
  const items: Array<{ keyword: string; traffic: string }> = []
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)

  for (const match of itemMatches) {
    const xml = match[1]
    const get = (tag: string) =>
      xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\/${tag}>`, "i"))?.[1]?.trim()
      || xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, "i"))?.[1]?.trim()
      || ""

    const title = get("title")
    const traffic = get("ht:approx_traffic") || "0"

    if (title) {
      items.push({ keyword: title, traffic })
    }
  }

  return items
}

function parseAutocompleteJSON(json: any[]): string[] {
  if (!Array.isArray(json)) return []
  const suggestions = json[1]
  if (!Array.isArray(suggestions)) return []
  return suggestions.map((s: any) => typeof s === "string" ? s : s[0] || "").filter(Boolean)
}

async function fetchGoogleAutocomplete(query: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return []
    const json = await res.json()
    return parseAutocompleteJSON(json)
  } catch {
    return []
  }
}

const AUTOCOMPLETE_SEEDS = [
  "how to", "what is", "best", "why is", "vs", "review",
  "AI", "technology", "cybersecurity", "programming",
  "web development", "gadgets", "tutorial",
]

function extractTrafficNumber(traffic: string): number {
  const cleaned = traffic.replace(/[+\s,]/g, "")
  const num = parseInt(cleaned, 10)
  return isNaN(num) ? 0 : num
}

function isTechRelated(keyword: string): boolean {
  const techTerms = [
    "ai", "artificial intelligence", "machine learning", "chatgpt", "openai",
    "gemini", "claude", "copilot", "llm", "gpt", "deep learning",
    "cyber", "hack", "vulnerability", "malware", "ransomware", "breach",
    "python", "javascript", "typescript", "react", "node", "rust",
    "programming", "coding", "developer", "software",
    "web", "app", "mobile", "iphone", "android", "mac", "windows",
    "cloud", "aws", "azure", "google cloud", "kubernetes", "docker",
    "crypto", "blockchain", "nft", "bitcoin", "ethereum",
    "gadget", "smartphone", "laptop", "tablet", "wearable",
    "tutorial", "how to", "guide", "learn", "beginner",
    "security", "privacy", "vpn", "encryption",
    "data", "database", "sql", "nosql",
    "startup", "tech", "digital", "saas", "api",
    "linux", "git", "github", "devops", "ci/cd",
    "review", "best", "vs", "comparison", "top",
    "electric vehicle", "ev", "tesla", "spacex", "robot",
  ]
  const lower = keyword.toLowerCase()
  return techTerms.some(term => lower.includes(term))
}

serve(async () => {
  try {
    const keywords: Array<{ keyword: string; source: string; search_volume: number }> = []
    const seen = new Set<string>()

    for (const url of TRENDS_URLS) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Blizine/1.0; +https://www.blizine.com/bot)",
          },
          signal: AbortSignal.timeout(10000),
        })
        if (!res.ok) continue
        const xml = await res.text()
        const trends = parseTrendsRSS(xml)

        for (const t of trends) {
          const lower = t.keyword.toLowerCase()
          if (!seen.has(lower) && isTechRelated(t.keyword)) {
            seen.add(lower)
            keywords.push({
              keyword: t.keyword,
              source: "google_trends",
              search_volume: extractTrafficNumber(t.traffic),
            })
          }
        }
      } catch {
        continue
      }
    }

    for (const seed of AUTOCOMPLETE_SEEDS) {
      try {
        const suggestions = await fetchGoogleAutocomplete(seed)
        for (const s of suggestions) {
          const lower = s.toLowerCase()
          if (!seen.has(lower) && isTechRelated(s)) {
            seen.add(lower)
            keywords.push({
              keyword: s,
              source: "google_autocomplete",
              search_volume: 0,
            })
          }
        }
      } catch {
        continue
      }
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .limit(1)

    const authorId = profiles?.[0]?.id
    if (!authorId) {
      return new Response(
        JSON.stringify({ error: "No author profile found" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    let inserted = 0
    let skipped = 0

    for (const kw of keywords) {
      const today = new Date().toISOString().slice(0, 10)

      const { data: existing } = await supabase
        .from("keyword_articles")
        .select("id")
        .eq("keyword", kw.keyword)
        .gte("created_at", today)
        .limit(1)

      if (existing && existing.length > 0) {
        skipped++
        continue
      }

      const { error } = await supabase
        .from("keyword_articles")
        .insert({
          keyword: kw.keyword,
          source: kw.source,
          search_volume: kw.search_volume,
          author_id: authorId,
          status: "draft",
        })

      if (!error) inserted++
    }

    return new Response(
      JSON.stringify({
        keywords_found: keywords.length,
        inserted,
        skipped,
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
