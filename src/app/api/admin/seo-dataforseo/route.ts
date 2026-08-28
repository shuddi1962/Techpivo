import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface DataForSEOTask {
  keyword?: string
  keywords?: string[]
  location_code?: number
  language_code?: string
  limit?: number
  target?: string
  date_from?: string
  date_to?: string
  item_types?: string[]
  filters?: any[]
  order_by?: string[]
  tag?: string
  postback_url?: string
  pingback_url?: string
  [k: string]: any
}

async function getApiKey(): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "dataforseo_api_key")
    .maybeSingle()
  if (error || !data) return null
  const v = data.value
  if (typeof v === "string" && v.trim().length > 0) return v.trim()
  if (v && typeof v === "object" && typeof v.value === "string" && v.value.trim().length > 0) return v.value.trim()
  return null
}

async function dataForSeoFetch(path: string, body: DataForSEOTask | DataForSEOTask[]) {
  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD
  const apiKey = (await getApiKey()) || (login && password ? `${login}:${password}` : null)
  if (!apiKey) {
    return { ok: false, status: 401, error: "DataForSEO API key not configured. Add it in Admin → Settings → SEO Intelligence, or set DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD in env." }
  }
  const auth = apiKey.includes(":") && !apiKey.startsWith("http")
    ? "Basic " + Buffer.from(apiKey).toString("base64")
    : "Basic " + Buffer.from(`${apiKey}:`).toString("base64")
  const url = path.startsWith("http") ? path : `https://api.dataforseo.com${path}`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  })
  const text = await res.text()
  let json: any = null
  try { json = JSON.parse(text) } catch { /* keep text */ }
  if (!res.ok) {
    return { ok: false, status: res.status, error: json?.status_message || text || `HTTP ${res.status}`, raw: json || text }
  }
  return { ok: true, status: res.status, data: json }
}

export async function POST(req: NextRequest) {
  let payload: { action: string; params?: DataForSEOTask; tasks?: DataForSEOTask[] } = { action: "" }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { action, params = {}, tasks = [] } = payload
  if (!action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 })
  }

  const defaults = {
    location_code: 2840,
    language_code: "en",
    limit: 50,
  }
  const merged = { ...defaults, ...params }

  try {
    switch (action) {
      case "test": {
        // Cheap call: a 1-keyword Google Ads Search Volume
        const r = await dataForSeoFetch("/v3/keywords_data/google_ads/search_volume/live", [
          { keywords: ["test"], location_code: 2840, language_code: "en" },
        ])
        return NextResponse.json(r)
      }

      case "search_volume": {
        const keywords = Array.isArray((params as any).keywords) ? (params as any).keywords : [(params as any).keyword || ""]
        if (!keywords[0]) return NextResponse.json({ error: "keywords required" }, { status: 400 })
        const r = await dataForSeoFetch("/v3/keywords_data/google_ads/search_volume/live", [
          { keywords, location_code: merged.location_code, language_code: merged.language_code },
        ])
        return NextResponse.json(r)
      }

      case "keywords_for_keyword":
      case "suggestions": {
        const seed = (params as any).keyword
        if (!seed) return NextResponse.json({ error: "keyword required" }, { status: 400 })
        const r = await dataForSeoFetch("/v3/keywords_data/google_ads/keywords_for_keywords/live", [
          { keywords: [seed], location_code: merged.location_code, language_code: merged.language_code, limit: merged.limit },
        ])
        return NextResponse.json(r)
      }

      case "related_keywords": {
        const seed = (params as any).keyword
        if (!seed) return NextResponse.json({ error: "keyword required" }, { status: 400 })
        const r = await dataForSeoFetch("/v3/keywords_data/google_ads/related_keywords/live", [
          { keywords: [seed], location_code: merged.location_code, language_code: merged.language_code, limit: merged.limit },
        ])
        return NextResponse.json(r)
      }

      case "serp_competitors": {
        const seed = (params as any).keyword
        if (!seed) return NextResponse.json({ error: "keyword required" }, { status: 400 })
        const r = await dataForSeoFetch("/v3/dataforseo_labs/google/serp_competitors/live", [
          { keywords: [seed], location_code: merged.location_code, language_code: merged.language_code, limit: merged.limit },
        ])
        return NextResponse.json(r)
      }

      case "keyword_difficulty": {
        const seed = (params as any).keyword
        if (!seed) return NextResponse.json({ error: "keyword required" }, { status: 400 })
        const r = await dataForSeoFetch("/v3/dataforseo_labs/google/bulk_keyword_difficulty/live", [
          { keywords: [seed], location_code: merged.location_code, language_code: merged.language_code },
        ])
        return NextResponse.json(r)
      }

      case "search_intent": {
        const seed = (params as any).keyword
        if (!seed) return NextResponse.json({ error: "keyword required" }, { status: 400 })
        const r = await dataForSeoFetch("/v3/dataforseo_labs/google/search_intent/live", [
          { keywords: [seed], location_code: merged.location_code, language_code: merged.language_code },
        ])
        return NextResponse.json(r)
      }

      case "domain_keywords": {
        const target = (params as any).target
        if (!target) return NextResponse.json({ error: "target (domain) required" }, { status: 400 })
        const r = await dataForSeoFetch("/v3/dataforseo_labs/google/domain_keywords/live", [
          { target, location_code: merged.location_code, language_code: merged.language_code, limit: merged.limit },
        ])
        return NextResponse.json(r)
      }

      case "ranked_keywords": {
        const target = (params as any).target
        if (!target) return NextResponse.json({ error: "target (domain) required" }, { status: 400 })
        const r = await dataForSeoFetch("/v3/keywords_data/google_ads/ranked_keywords/live", [
          { target, location_code: merged.location_code, language_code: merged.language_code, limit: merged.limit },
        ])
        return NextResponse.json(r)
      }

      case "competitors_domain": {
        const target = (params as any).target
        if (!target) return NextResponse.json({ error: "target (domain) required" }, { status: 400 })
        const r = await dataForSeoFetch("/v3/dataforseo_labs/google/competitors_domain/live", [
          { target, location_code: merged.location_code, language_code: merged.language_code, limit: merged.limit },
        ])
        return NextResponse.json(r)
      }

      case "content_gap": {
        const target = (params as any).target
        if (!target) return NextResponse.json({ error: "target (your domain) required" }, { status: 400 })
        const r = await dataForSeoFetch("/v3/dataforseo_labs/google/content_gap/live", [
          { target, location_code: merged.location_code, language_code: merged.language_code, limit: merged.limit },
        ])
        return NextResponse.json(r)
      }

      case "trends_explore": {
        const keywords = Array.isArray((params as any).keywords) ? (params as any).keywords : []
        if (keywords.length === 0) return NextResponse.json({ error: "keywords required" }, { status: 400 })
        const r = await dataForSeoFetch("/v3/keywords_data/google_trends/explore/live", [
          { keywords, location_code: merged.location_code, language_code: merged.language_code },
        ])
        return NextResponse.json(r)
      }

      case "labs_keyword_ideas": {
        const seed = (params as any).keyword
        if (!seed) return NextResponse.json({ error: "keyword required" }, { status: 400 })
        const r = await dataForSeoFetch("/v3/dataforseo_labs/google/keyword_ideas/live", [
          { keywords: [seed], location_code: merged.location_code, language_code: merged.language_code, limit: merged.limit, include_clickstream_data: false },
        ])
        return NextResponse.json(r)
      }

      case "ai_chat": {
        const question = (params as any).question
        const context = (params as any).context || {}
        if (!question) return NextResponse.json({ error: "question required" }, { status: 400 })

        const seeds = await gatherSeedKeywords()
        const r = await dataForSeoFetch("/v3/dataforseo_labs/google/keyword_ideas/live", [
          {
            keywords: seeds.slice(0, 5),
            location_code: merged.location_code,
            language_code: merged.language_code,
            limit: 20,
            include_clickstream_data: false,
          },
        ])

        const trends = await dataForSeoFetch("/v3/keywords_data/google_trends/explore/live", [
          { keywords: seeds.slice(0, 3), location_code: merged.location_code, language_code: merged.language_code },
        ])

        const answer = buildChatAnswer(question, r?.items || [], trends?.items || [], context)
        return NextResponse.json({ answer, items: r?.items?.slice(0, 10) || [], trends: trends?.items?.slice(0, 10) || [] })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", service: "dataforseo" })
}

async function gatherSeedKeywords(): Promise<string[]> {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from("keyword_articles")
      .select("keyword, search_volume")
      .gt("search_volume", 0)
      .order("search_volume", { ascending: false })
      .limit(10)
    return (data || []).map((r: any) => r.keyword).filter(Boolean)
  } catch {
    return ["ai tools", "how to learn programming", "best laptops 2026", "cybersecurity tips", "react tutorial"]
  }
}

function buildChatAnswer(question: string, items: any[], trends: any[], context: any): string {
  const q = question.toLowerCase()
  const topByVol = [...items].sort((a, b) => (b.search_volume || 0) - (a.search_volume || 0)).slice(0, 10)
  const topByVolText = topByVol.length
    ? topByVol.map((i, idx) => `${idx + 1}. "${i.keyword}" — ${(i.search_volume || 0).toLocaleString()} searches/mo ($${(i.cpc || 0).toFixed(2)} CPC, comp ${Math.round((i.competition || 0) * 100)}%)`).join("\n")
    : "No volume data."

  const trendText = trends.length
    ? trends.slice(0, 5).map((t: any) => `• ${t.keyword || t.topic_title} (${(t.search_volume || 0).toLocaleString()} vol, trend: ${t.trend || "—"})`).join("\n")
    : "No trends data."

  const ctx = context || {}
  const topKws = (ctx.topKeywords || []).slice(0, 5).map((k: any) => `• ${k.keyword} (${(k.volume || 0).toLocaleString()})`).join("\n") || "• (no published keywords yet)"

  if (q.includes("how to") || q.includes("tutorial")) {
    return `How-to & tutorial opportunities ranked by search demand:\n\n${topByVolText}\n\nSuggested article formats based on intent:\n• "Step-by-step" tutorials (target queries like "how to do X in 2026")\n• "Beginner-friendly" explainers (lower competition, faster rank)\n• "Comparison tutorials" (X vs Y for beginners)\n\nThese would all fit your Tutorials category.`
  }
  if (q.includes("review") || q.includes("best") || q.includes("top")) {
    return `High-traffic review & recommendation keywords:\n\n${topByVolText}\n\nBest fit for your Reviews category. Aim for:\n• Long-form reviews (1,500+ words, hands-on tone)\n• "Best X for [audience]" articles (e.g. "Best laptops for Nigerian developers")\n• Side-by-side comparison tables\n\nReviews have higher commercial intent and better affiliate potential.`
  }
  if (q.includes("compare") || q.includes(" vs ") || q.includes("vs ")) {
    return `Comparison article opportunities:\n\n${topByVolText}\n\nFor each, build a comparison page with:\n• Side-by-side feature table\n• Price + value verdict\n• "Who should pick which" section\n\nComparison articles rank quickly because searchers have clear intent.`
  }
  if (q.includes("ai") || q.includes("gpt") || q.includes("gemini") || q.includes("claude")) {
    return `AI search trends right now:\n\n${trendText}\n\nRecommended AI coverage angles:\n• Hands-on tutorials ("How to use Gemini 2.5 Flash for [task]")\n• Comparison pieces ("Gemini vs ChatGPT for [use case]")\n• News on new model releases (track Google / OpenAI / Anthropic blogs)\n• Workflow articles ("Build a [project] with [model]")\n\nAI & Automation is one of your strongest categories.`
  }
  if (q.includes("gap") || q.includes("missing") || q.includes("missing")) {
    return `Content gap analysis:\n\nYour published top keywords by volume:\n${topKws}\n\nDataForSEO keyword ideas show ${items.length} related searches you haven't covered. Highest opportunity gaps (high volume + low competition):\n\n${topByVolText}\n\nThese are the topics your competitors rank for that you don't.`
  }
  if (q.includes("today") || q.includes("now") || q.includes("trending")) {
    return `What to write today, ranked by potential traffic:\n\n${topByVolText}\n\nTrending now:\n${trendText}\n\nYou currently have ${ctx.publishedCount || 0} published articles, ${ctx.draftCount || 0} drafts in queue, and ${(ctx.totalVolume || 0).toLocaleString()} total monthly search volume across your portfolio.\n\nMy top 3 picks for immediate impact:\n1. Highest-volume keyword with low competition — fastest rank\n2. Trending topic with timing advantage — most clicks right now\n3. Question-format query (FAQ-style) — featured snippet opportunity`
  }

  return `Here's what DataForSEO + your site data show:\n\nTOP KEYWORD OPPORTUNITIES (by search volume):\n${topByVolText}\n\nCURRENT TRENDS:\n${trendText}\n\nYOUR PORTFOLIO:\n• ${ctx.publishedCount || 0} published articles\n• ${ctx.draftCount || 0} drafts in queue\n• ${(ctx.totalVolume || 0).toLocaleString()} total monthly searches targeted\n\nAsk me more specifically: "what should I write today", "content gaps", "how-to keywords", "review opportunities", "AI news", "comparison articles", or "tutorials needed".`
}
