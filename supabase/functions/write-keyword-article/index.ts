import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[]
    }
  }[]
}

interface OpenRouterResponse {
  choices?: {
    message?: {
      content?: string
    }
  }[]
}

async function callGemini(prompt: string): Promise<string> {
  const key = Deno.env.get("GEMINI_API_KEY")
  if (!key) throw new Error("GEMINI_API_KEY not set")

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.8 },
      }),
      signal: AbortSignal.timeout(120000),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error (${res.status}): ${err}`)
  }

  const data: GeminiResponse = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ""
}

async function callOpenRouter(prompt: string): Promise<string> {
  const key = Deno.env.get("OPENROUTER_API_KEY")
  if (!key) throw new Error("OPENROUTER_API_KEY not set")

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct:free",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(120000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter API error (${res.status}): ${err}`)
  }

  const data: OpenRouterResponse = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ""
}

async function logGeminiCall(): Promise<boolean> {
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const { count } = await supabase
    .from("gemini_usage_log")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayStart.toISOString())

  const usedToday = count || 0
  const GEMINI_DAILY_CAP = 20

  if (usedToday >= GEMINI_DAILY_CAP) return false

  await supabase.from("gemini_usage_log").insert({
    model: "gemini-2.5-flash",
    action: "write-keyword-article",
    tokens_used: 0,
  })

  return true
}

async function pexelsSearch(query: string): Promise<string | null> {
  const key = Deno.env.get("PEXELS_API_KEY")
  if (!key) return null
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: key }, signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.photos?.[0]?.src?.large2x || null
  } catch {
    return null
  }
}

function autoCategory(keyword: string): string | null {
  const t = keyword.toLowerCase()
  const rules: Array<{ words: string[]; slug: string }> = [
    { words: ["hack", "vulnerability", "breach", "malware", "ransomware", "cve", "exploit", "phishing", "zero-day", "cyber", "security", "privacy", "vpn", "encryption"], slug: "cybersecurity" },
    { words: ["ai", "artificial intelligence", "machine learning", "chatgpt", "gemini", "openai", "gpt", "llm", "deep learning", "copilot", "claude", "neural"], slug: "ai-automation" },
    { words: ["iphone", "android", "smartphone", "macbook", "galaxy", "pixel", "tablet", "wearable", "airpods", "smartwatch"], slug: "gadgets" },
    { words: ["javascript", "python", "rust", "golang", "typescript", "react", "node", "vue", "angular", "programming", "coding", "developer", "git", "github"], slug: "programming" },
    { words: ["css", "html", "frontend", "next.js", "tailwind", "web", "responsive", "ui", "ux", "design system"], slug: "web-development" },
    { words: ["how to", "tutorial", "guide", "beginner", "learn", "step by", "walkthrough"], slug: "tutorials" },
    { words: ["startup", "funding", "saas", "business", "revenue", "growth"], slug: "digital-business" },
    { words: ["cloud", "kubernetes", "docker", "devops", "aws", "azure", "gcp", "server", "network", "vpn", "infrastructure"], slug: "networking-it" },
    { words: ["review", "best", "vs", "comparison", "top", "rated"], slug: "reviews" },
  ]
  for (const r of rules) {
    if (r.words.some(w => t.includes(w))) return r.slug
  }
  return "tech-news"
}

function makeSlug(title: string): string {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) + "-" + Date.now().toString(36)
}

serve(async () => {
  try {
    const { data: kwArticles } = await supabase
      .from("keyword_articles")
      .select("*")
      .eq("status", "draft")
      .order("search_volume", { ascending: false })
      .limit(10)

    if (!kwArticles || kwArticles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No keyword articles to write" }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    const { data: categories } = await supabase
      .from("categories")
      .select("id, slug")

    const catMap = new Map<string, string>()
    if (categories) {
      for (const c of categories) {
        catMap.set(c.slug, c.id)
      }
    }

    let writtenArticles = 0
    const results: Array<{ keyword: string; success: boolean; error?: string }> = []

    for (const article of kwArticles) {
      try {
        const useGemini = await logGeminiCall()
        const aiCaller = useGemini ? callGemini : callOpenRouter
        const modelUsed = useGemini ? "gemini-2.5-flash" : "openrouter-meta-llama-3.3-70b"

        const articlePrompt =
          `You are a professional tech journalist writing for "Blizine" (https://blizine.com). ` +
          `Write a complete, engaging, original article about the topic: "${article.keyword}".\n\n` +
          `REQUIREMENTS:\n` +
          `1. Write 600-1000 words in clean HTML (no markdown). Use <h2> for subheadings, <p> for paragraphs.\n` +
          `2. Include an "answer capsule" — a concise 2-3 sentence direct answer to the query, wrapped in <div class="answer-capsule">. This is critical for featured snippets and AI overviews.\n` +
          `3. Write a strong, engaging introduction that hooks the reader immediately.\n` +
          `4. Include practical, actionable information. Cite specific facts, data, or steps.\n` +
          `5. End with a concluding section that summarizes key takeaways.\n` +
          `6. Write at a 9th-grade reading level for broad accessibility.\n` +
          `7. Do NOT fabricate quotes or attribute statements to people without verification.\n` +
          `8. Make it Google AdSense compliant — no hate speech, no misleading content, no dangerous/dangerous product claims, no sexually suggestive content.\n\n` +
          `Now write the full article HTML:`

        const articleHtml = await aiCaller(articlePrompt)

        const seoPrompt =
          `Generate SEO metadata for an article about "${article.keyword}". ` +
          `Return ONLY valid JSON with these fields:\n` +
          `"seo_title": compelling title with keyword (max 60 chars),\n` +
          `"seo_description": meta description (max 160 chars),\n` +
          `"seo_keywords": array of 5-10 related keywords/phrases,\n` +
          `"tags": array of 3-5 tag words,\n` +
          `"answer_capsule": 2-3 sentence direct answer for AI snippet (max 60 words).\n` +
          `No markdown, no backticks, no explanation.`

        const seoRaw = await aiCaller(seoPrompt)
        const cleaned = seoRaw.replace(/```(?:json)?\s*|\s*```/gi, "").trim()
        let seoData: any = {}
        try { seoData = JSON.parse(cleaned) } catch { seoData = {} }

        const excerpt = (articleHtml.replace(/<[^>]+>/g, "").slice(0, 200).trim() || "").replace(/\s+/g, " ")

        const catSlug = autoCategory(article.keyword)
        const categoryId = catMap.get(catSlug) || null

        let image = await pexelsSearch(article.keyword)
        if (!image) image = await pexelsSearch(catSlug.replace("-", " ") + " technology")

        const slug = makeSlug((seoData.seo_title || article.keyword))

        const answerCapsule = seoData.answer_capsule || ""

        const quickBriefText = excerpt.slice(0, 150)
        const keyPoints = articleHtml.match(/<h2>(.*?)<\/h2>/g)?.slice(0, 5).map(h => h.replace(/<\/?h2>/g, "")) || [article.keyword]

        const { error: updateError } = await supabase
          .from("keyword_articles")
          .update({
            title: seoData.seo_title || article.keyword,
            slug,
            content: articleHtml,
            excerpt,
            featured_image: image,
            category_id: categoryId,
            status: "published",
            seo_title: seoData.seo_title || null,
            seo_description: seoData.seo_description || null,
            seo_keywords: seoData.seo_keywords || [],
            tags: seoData.tags || [],
            quick_brief: quickBriefText ? [{ text: quickBriefText }] : [],
            key_points: keyPoints.map((k: string, i: number) => `${i + 1}. ${k}`),
            answer_capsule: answerCapsule,
            published_at: new Date().toISOString(),
            reading_time: Math.max(1, Math.round((articleHtml.split(" ").length || 100) / 200)),
            pexels_image_url: image || null,
          })
          .eq("id", article.id)

        if (updateError) {
          results.push({ keyword: article.keyword, success: false, error: updateError.message })
        } else {
          writtenArticles++
          results.push({ keyword: article.keyword, success: true, error: undefined })
        }
      } catch (err) {
        results.push({
          keyword: article.keyword,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return new Response(
      JSON.stringify({
        processed: kwArticles.length,
        written: writtenArticles,
        results,
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
