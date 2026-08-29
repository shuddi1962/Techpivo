import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { resolveOpenRouterKey, resolveOpenRouterModel } from "@/lib/openrouter-model"
import { SITE_URL } from "@/lib/constants"

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
  const stored = await getApiKey()
  let authString: string | null = null
  if (stored) {
    authString = stored.includes(":") ? stored : `${stored}:`
  } else if (login && password) {
    authString = `${login}:${password}`
  }
  if (!authString) {
    return { ok: false, status: 401, error: "DataForSEO credentials not configured. Add them in Admin → Settings → SEO Intelligence (paste as 'login:password' from https://app.dataforseo.com/api-access), or set DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD in env." }
  }
  const auth = "Basic " + Buffer.from(authString).toString("base64")
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
  // Extract items from DataForSEO tasks[0].result into a flat items array
  const rawTasks = json && json.tasks
  const firstTask = Array.isArray(rawTasks) ? rawTasks[0] : null
  const rawResult = firstTask && firstTask.result
  const items = Array.isArray(rawResult) ? rawResult : []
  return { ok: true, status: res.status, data: { ...json, items } }
}

export async function POST(req: NextRequest) {
  let payload: { action: string; params?: DataForSEOTask; tasks?: DataForSEOTask[] } = { action: "" }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { action, params: rawParams = {}, tasks = [] } = payload
  if (!action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 })
  }

  // Accept both { params: { keyword } } and flat { keyword } from the client
  const flat: any = { ...rawParams }
  for (const k of Object.keys(payload)) {
    if (k !== "action" && k !== "params" && k !== "tasks" && !(k in flat)) flat[k] = (payload as any)[k]
  }
  const params: any = flat

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
        const target = (params as any).target || (params as any).domain
        if (!target) return NextResponse.json({ error: "target (domain) required" }, { status: 400 })
        const r = await dataForSeoFetch("/v3/dataforseo_labs/google/domain_keywords/live", [
          { target, location_code: merged.location_code, language_code: merged.language_code, limit: merged.limit },
        ])
        return NextResponse.json(r)
      }

      case "ranked_keywords": {
        const target = (params as any).target || (params as any).domain
        if (!target) return NextResponse.json({ error: "target (domain) required" }, { status: 400 })
        const r = await dataForSeoFetch("/v3/keywords_data/google_ads/ranked_keywords/live", [
          { target, location_code: merged.location_code, language_code: merged.language_code, limit: merged.limit },
        ])
        return NextResponse.json(r)
      }

      case "competitors_domain": {
        const target = (params as any).target || (params as any).domain
        if (!target) return NextResponse.json({ error: "target (domain) required" }, { status: 400 })
        const r = await dataForSeoFetch("/v3/dataforseo_labs/google/competitors_domain/live", [
          { target, location_code: merged.location_code, language_code: merged.language_code, limit: merged.limit },
        ])
        return NextResponse.json(r)
      }

      case "content_gap": {
        const target = (params as any).target || (params as any).domain
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
        const [r, trends] = await Promise.all([
          dataForSeoFetch("/v3/dataforseo_labs/google/keyword_ideas/live", [
            { keywords: seeds.slice(0, 5), location_code: merged.location_code, language_code: merged.language_code, limit: 30, include_clickstream_data: false },
          ]),
          dataForSeoFetch("/v3/keywords_data/google_trends/explore/live", [
            { keywords: seeds.slice(0, 3), location_code: merged.location_code, language_code: merged.language_code },
          ]),
        ])

        const items = (r as any)?.items || []
        const trendsItems = (trends as any)?.items || []

        const { answer, debug } = await generateChatAnswerWithAI(
          question,
          items,
          trendsItems,
          context,
          merged.location_code,
          merged.language_code
        )
        return NextResponse.json({ answer, items: items.slice(0, 10), trends: trendsItems.slice(0, 10), debug })
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

// ── AI-powered chat answer generation ─────────────────────────────────────────
const LOCATION_NAMES: Record<number, string> = {
  2840: "United States", 2826: "United Kingdom", 2158: "India", 2768: "Canada",
  2763: "Australia", 2765: "Germany", 2766: "France", 2717: "Brazil",
  2824: "UAE", 2762: "Nigeria", 2827: "Kenya", 2724: "South Africa",
}
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German", pt: "Portuguese",
  hi: "Hindi", zh: "Chinese", ja: "Japanese", ar: "Arabic", sw: "Swahili",
}

async function generateChatAnswerWithAI(
  question: string,
  items: any[],
  trends: any[],
  context: any,
  locationCode: number,
  languageCode: string,
): Promise<{ answer: string; debug: string }> {
  const apiKey = await resolveOpenRouterKey()
  if (!apiKey) {
    return {
      answer: buildFallbackAnswer(question, items, trends, context, locationCode, languageCode),
      debug: "no_openrouter_key",
    }
  }

  const model = (await resolveOpenRouterModel()) || "minimax/minimax-m3:free"
  const locationName = LOCATION_NAMES[locationCode] || `Location ${locationCode}`
  const langName = LANGUAGE_NAMES[languageCode] || languageCode

  const topKeywords = [...items]
    .sort((a: any, b: any) => (b.search_volume || 0) - (a.search_volume || 0))
    .slice(0, 15)

  const kwText = topKeywords.length
    ? topKeywords.map((i: any, idx: number) =>
      `${idx + 1}. "${i.keyword}" — ${(i.search_volume || 0).toLocaleString()} searches/mo | $${i.cpc || 0} CPC | comp ${Math.round((i.competition || 0) * 100)}%`
    ).join("\n")
    : "No keyword data available."

  const trendText = trends.length
    ? trends.slice(0, 8).map((t: any) =>
      `• ${t.keyword || t.topic_title || t.topic || "Trending topic"} | ${(t.search_volume || 0).toLocaleString()} vol`
    ).join("\n")
    : "No trend data available."

  const ctx = context || {}
  const portfolio = `Published: ${ctx.publishedCount || 0} articles | Queue: ${ctx.draftCount || 0} drafts | Total targeted search volume: ${(ctx.totalVolume || 0).toLocaleString()}/mo`

  const systemPrompt = `You are TechPivo's senior SEO content strategist. Your job is to give sharp, specific, actionable recommendations — not generic advice.

CRITICAL RULES:
- Always respond in the same language as the question (English, Spanish, French, etc.)
- Never say "I don't have enough data" — work with what you have.
- Every recommendation must include a specific headline idea or article title.
- Always reference actual numbers from the data provided (volumes, CPC, competition).
- Never repeat the same recommendation across different question types.
- Your audience is global (developers, tech enthusiasts, gadget buyers worldwide).`

  const userPrompt = `QUESTION: ${question}

KEYWORD DATA (${locationName}, ${langName}):
${kwText}

TREND DATA:
${trendText}

PORTFOLIO: ${portfolio}

TASK: Answer the question directly using the data above. Be specific — give actual article headline ideas with the numbers that support each recommendation. Format suggestions as a numbered list with titles and the data backing each choice. If no keyword data exists, use your knowledge of the topic to give expert recommendations and say so.`

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": SITE_URL,
        "X-Title": "Techpivo",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1200,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(60000),
    })

    if (!res.ok) {
      const err = await res.text().catch(() => "")
      console.warn(`[ai_chat OpenRouter] HTTP ${res.status}: ${err.slice(0, 100)}`)
      return { answer: buildFallbackAnswer(question, items, trends, context, locationCode, languageCode), debug: `openrouter_${res.status}` }
    }

    const data = await res.json().catch(() => null)
    const reply = data?.choices?.[0]?.message?.content?.trim()
    if (!reply) throw new Error("empty response")

    return { answer: reply, debug: `openrouter:${model}` }
  } catch (e: any) {
    console.warn(`[ai_chat] AI error: ${e.message}`)
    return { answer: buildFallbackAnswer(question, items, trends, context, locationCode, languageCode), debug: `error:${e.message.slice(0, 40)}` }
  }
}

function buildFallbackAnswer(
  question: string,
  items: any[],
  trends: any[],
  context: any,
  locationCode: number,
  languageCode: string,
): string {
  const q = question.toLowerCase()
  const locationName = LOCATION_NAMES[locationCode] || `Location ${locationCode}`
  const langName = LANGUAGE_NAMES[languageCode] || languageCode

  const top = [...items]
    .sort((a: any, b: any) => (b.search_volume || 0) - (a.search_volume || 0))
    .slice(0, 10)

  if (!top.length && !trends.length) {
    const ctx = context || {}
    return `I don't have enough keyword data to answer that yet — try running a search volume or keyword ideas query first in the SEO Insights tab.

Your portfolio: ${ctx.publishedCount || 0} published | ${ctx.draftCount || 0} in queue | ${(ctx.totalVolume || 0).toLocaleString()} monthly searches targeted.

Once you gather keywords for "${ctx.topKeywords?.[0]?.keyword || "your topics"}", come back and I'll give you specific recommendations.`
  }

  const kwLines = top.map((i: any, idx: number) =>
    `${idx + 1}. "${i.keyword}" — ${(i.search_volume || 0).toLocaleString()} searches/mo`
  ).join("\n")

  if (q.includes("what to write") || q.includes("today") || q.includes("trending")) {
    const top3 = top.slice(0, 3).map((i: any, idx: number) =>
      `${idx + 1}. "${i.keyword}" — ${(i.search_volume || 0).toLocaleString()} searches/mo in ${locationName} (${langName})`
    ).join("\n")
    return `Here's what to write today based on real search demand:\n\n${top3}\n\nEach of these targets high-intent searches with real monthly volume. Pick the one closest to your next publishing slot and draft it today.`
  }
  if (q.includes("gap") || q.includes("missing")) {
    return `Content gaps in your portfolio:\n\n${kwLines}\n\nYou have ${(context?.publishedCount || 0)} published articles. These keywords above are opportunities — topics with demand you haven't covered yet. Priority = highest search volume with lowest competition in your keyword data.`
  }
  if (q.includes("how to") || q.includes("tutorial")) {
    return `How-to keyword opportunities in ${locationName} (${langName}):\n\n${kwLines}\n\nThese are question-format queries — ideal for tutorial articles. Structure each as: problem → step-by-step solution → expected outcome.`
  }
  if (q.includes("review") || q.includes("best") || q.includes("top ") || q.includes("comparison")) {
    return `Commercial-intent keywords for ${locationName} (${langName}):\n\n${kwLines}\n\nHigh CPC means commercial intent — these work for product reviews, comparisons, and affiliate content. Build articles with clear CTAs and price/value tables.`
  }
  if (q.includes("ai") || q.includes("gpt") || q.includes("gemini") || q.includes("claude")) {
    return `AI & LLMs keywords in ${locationName} (${langName}):\n\n${kwLines}\n\nThese queries cover AI tools, models, and workflows. Combine with hands-on tutorials and comparison pieces for maximum reach.`
  }

  return `Here's what your keyword data shows for ${locationName} (${langName}):\n\n${kwLines}\n\n${trends.length ? `TRENDING NOW:\n${trends.slice(0, 5).map((t: any) => `• ${t.keyword || t.topic_title || "Trending"}${t.search_volume ? ` — ${t.search_volume.toLocaleString()} vol` : ""}`).join("\n")}` : ""}\n\n${(context?.publishedCount || 0)} articles published | ${(context?.draftCount || 0)} in queue | ${(context?.totalVolume || 0).toLocaleString()} total monthly searches targeted.`
}
