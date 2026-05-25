import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PEXELS_API_KEY = "GH735sp9bohSxSm2PnTFewYGjsZvGS2UoE0JzLCMgFgG2bAV0UTihSVn"

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Blizine/1.0)" },
    })
    if (!response.ok) return null
    const html = await response.text()
    for (const p of [
      /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
      /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
      /<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i,
      /<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp))["']/i,
    ]) {
      const m = html.match(p)
      if (m) return m[1].startsWith("//") ? "https:" + m[1] : m[1].split("?")[0]
    }
    return null
  } catch { return null }
}

async function searchPexels(query: string): Promise<string | null> {
  try {
    const response = await fetch(
      "https://api.pexels.com/v1/search?query=" + encodeURIComponent(query) + "&per_page=3",
      { headers: { Authorization: PEXELS_API_KEY }, signal: AbortSignal.timeout(10000) }
    )
    if (!response.ok) return null
    const data = await response.json()
    return data.photos?.[0]?.src?.large || null
  } catch { return null }
}

async function callOpenRouter(prompt: string, apiKey: string, maxTokens = 4096): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
      "HTTP-Referer": "https://blizine.vercel.app",
      "X-Title": "Blizine",
    },
    body: JSON.stringify({
      model: "openrouter/free",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(90000),
  })
  if (!response.ok) throw new Error("OpenRouter error: " + response.status)
  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || ""
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim()
}

export async function GET() {
  try {
    const openRouterKey = process.env.OPENROUTER_API_KEY || ""
    if (!openRouterKey) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY not set" }, { status: 500 })
    }

    const { data: posts, error: fetchError } = await supabase
      .from("posts")
      .select("id, title, content, featured_image, original_source_url, category_id")
      .is("blizine_score", null)
      .limit(5)

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
    if (!posts?.length) return NextResponse.json({ rewritten: 0, total: 0 })

    let rewritten = 0
    for (const post of posts) {
      try {
        const textContent = stripHtml(post.content || "")
        if (textContent.length < 50) { rewritten++; continue }

        let blizineScore: number | null = null
        let quickBrief: { text: string }[] = []

        // Full rewrite with improved prompt (wrapped in try/catch so failures don't block score update)
        try {
          const rewritePrompt =
            "You are a professional tech journalist writing for Blizine, a technology news blog. " +
            "Rewrite the following article in a compelling, authoritative, and engaging style. " +
            "Requirements:\n" +
            "- Write a complete article (minimum 800 words) that covers all key facts from the original\n" +
            "- Start with a hook that grabs the reader's attention\n" +
            "- Use clear H2 and H3 subheadings to structure the piece\n" +
            "- Include specific details, data points, and quotes from the original\n" +
            "- Maintain a professional yet accessible tone\n" +
            "- End with a conclusion that provides context or takeaways\n" +
            "- Output ONLY valid HTML (no markdown, no code fences)\n" +
            "- Use <p> for paragraphs, <h2>/<h3> for headings, <strong> for emphasis\n" +
            "- The article must be self-contained so readers never need the original source\n\n" +
            "Title: " + post.title + "\n\nOriginal content:\n" + textContent

          const result = await callOpenRouter(rewritePrompt, openRouterKey, 8192)
          if (result && result.length > 500) {
            await supabase.from("posts").update({ content: result, ai_rewritten: true }).eq("id", post.id)
          }
        } catch { /* rewrite failed but continue to set score */ }

        // Quick brief
        try {
          const briefPrompt =
            "Summarize the following article into exactly 3 concise bullet points capturing the most important information. " +
            'Return a JSON array of objects with a "text" property for each bullet. No markdown, no backticks, just JSON. ' +
            'Example: [{"text": "First key point"}, {"text": "Second key point"}, {"text": "Third key point"}] ' +
            "Article: " + post.title + ". " + textContent.slice(0, 3000)

          const briefResult = await callOpenRouter(briefPrompt, openRouterKey)
          if (briefResult) {
            const cleaned = briefResult.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()
            const parsed = JSON.parse(cleaned)
            if (Array.isArray(parsed)) quickBrief = parsed
          }
        } catch { /* skip */ }

        // Blizine score
        try {
          const scorePrompt =
            "Rate the following article's relevance to technology, innovation, and digital culture on a scale of 1 to 100. " +
            "Consider: tech relevance, factual accuracy, timeliness, and reader value. " +
            "Return ONLY a number between 1 and 100. Article: " + post.title + ". " + textContent.slice(0, 1000)
          const scoreResult = await callOpenRouter(scorePrompt, openRouterKey)
          const parsed = parseInt(scoreResult.replace(/\D/g, ""), 10)
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) blizineScore = parsed
        } catch { /* skip */ }

        // Fetch image if missing
        if (!post.featured_image) {
          try {
            let img: string | null = null
            if (post.original_source_url) img = await fetchOgImage(post.original_source_url)
            if (!img) img = await searchPexels(post.title.split(" ").slice(0, 5).join(" "))
            if (img) await supabase.from("posts").update({ featured_image: img }).eq("id", post.id)
          } catch { /* skip */ }
        }

        const updateData: Record<string, unknown> = {
          ai_rewritten: true,
          quick_brief: quickBrief.length > 0 ? quickBrief : [],
          blizine_score: blizineScore ?? 0,
        }

        const { error: updateError } = await supabase.from("posts").update(updateData).eq("id", post.id)
        if (updateError) {
          console.error("Update error for", post.id, updateError.message)
        } else {
          rewritten++
        }
      } catch (e: any) {
        console.error("Failed for", post.id, e.message)
      }
    }

    return NextResponse.json({ rewritten, total: posts.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
