import { NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function callOpenRouter(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
    }),
    signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) throw new Error("OpenRouter error: " + response.status)
  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || ""
}

export async function GET() {
  try {
    const openRouterKey = process.env.OPENROUTER_API_KEY || ""

    // Find posts missing quick_brief or quality_score
    const { data: posts, error } = await getSupabase()
      .from("posts")
      .select("id, title, content, ai_rewritten")
      .limit(50)
      .or("quick_brief.eq.[],quick_brief.is.null")

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!posts?.length) return NextResponse.json({ enriched: 0, total: 0 })

    let enriched = 0
    for (const post of posts) {
      if (!openRouterKey) break
      const textContent = post.content?.replace(/<[^>]*>/g, "").trim() || ""
      if (textContent.length < 100) continue

      try {
        // Quick Brief
        const briefPrompt =
          "Generate exactly 3 bullet points summarizing the key takeaways from this tech article. " +
          'Return ONLY a JSON array of objects with "text" fields, no markdown. Article: ' + post.title + ". " + textContent

        const briefResult = await callOpenRouter(briefPrompt, openRouterKey)
        let quickBrief: { text: string }[] = []
        try {
          const cleaned = briefResult.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()
          quickBrief = JSON.parse(cleaned)
        } catch { quickBrief = [{ text: briefResult.slice(0, 200) }] }

        // Techpivo Score
        const scorePrompt =
          "Rate the following article's relevance to technology on a scale of 1 to 100. Return ONLY a number. Article: " +
          post.title + ". " + textContent.slice(0, 1000)

        const scoreResult = await callOpenRouter(scorePrompt, openRouterKey)
        const qualityScore = parseInt(scoreResult.replace(/\D/g, ""), 10) || null
        const validScore = qualityScore && qualityScore >= 1 && qualityScore <= 100 ? qualityScore : null

        await getSupabase().from("posts").update({ quick_brief: quickBrief, quality_score: validScore }).eq("id", post.id)
        enriched++
      } catch (e: any) {
        console.error(`Enrich failed for ${post.id}: ${e.message}`)
      }
      await new Promise((r) => setTimeout(r, 1500))
    }

    return NextResponse.json({ enriched, total: posts.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
