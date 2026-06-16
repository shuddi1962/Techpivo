import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface QuickBriefItem {
  text: string
}

interface SEOData {
  seo_title?: string
  seo_description?: string
  seo_keywords?: string[]
  og_image?: string
}

interface OpenRouterResponse {
  choices?: {
    message?: {
      content?: string
    }
  }[]
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&#\d+;/g, m => String.fromCharCode(parseInt(m.slice(2, -1))))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .trim()
}

async function callOpenRouter(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "qwen/qwen3-coder:free",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(60000),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`)
  }

  const data: OpenRouterResponse = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || ""
}

async function fetchOriginalContent(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { "User-Agent": "Blizine/1.0" },
  })

  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`)

  const html = await response.text()

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : ""

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  const body = bodyMatch ? bodyMatch[1] : html

  const cleaned = body
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "")

  const textContent = stripHtml(cleaned).slice(0, 10000)
  return title ? `${title}\n\n${textContent}` : textContent
}

serve(async (req) => {
  try {
    const { post_id } = await req.json()
    if (!post_id) {
      return new Response(
        JSON.stringify({ error: "post_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || ""
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY") || ""

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Supabase credentials not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: post, error: fetchError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", post_id)
      .single()

    if (fetchError || !post) {
      console.error(`Post fetch error: ${fetchError?.message}`)
      return new Response(
        JSON.stringify({ error: fetchError?.message || "Post not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }

    let sourceContent = post.content || ""
    let sourceTitle = post.title || ""

    if (sourceContent.length < 500 && post.original_source_url) {
      try {
        const fetched = await fetchOriginalContent(post.original_source_url)
        if (fetched.length > sourceContent.length) {
          const lines = fetched.split("\n")
          sourceTitle = lines[0] || sourceTitle
          sourceContent = lines.slice(1).join("\n").trim() || fetched
        }
      } catch (err: any) {
        console.error(`Failed to fetch original content: ${err.message}`)
      }
    }

    const textContent = stripHtml(sourceContent)

    let rewrittenContent = textContent
    let quickBrief: QuickBriefItem[] = []
    let seoData: SEOData = {}
    let blizineScore: number | null = null

    if (openRouterKey && textContent.length > 50) {
      try {
        const rewritePrompt =
          `You are an expert tech journalist writing for the blog "Techpivo". ` +
          `Rewrite the following article in your OWN WORDS. Never copy sentences verbatim. ` +
          `Use a completely different structure, different opening, and different phrasing. ` +
          `Write a FULL complete article (600+ words) with: ` +
          `1) An engaging introduction that jumps straight into the topic ` +
          `2) Well-structured H2/H3 subheadings ` +
          `3) A strong conclusion with key takeaways ` +
          `IMPORTANT RULES: ` +
          `- Do NOT start with "In the article", "According to", "The original", "This article" or similar ` +
          `- Do NOT include any HTML tags or special characters. Write clean plain text ` +
          `- Fully rephrase every sentence - change sentence structure, word choice, and flow ` +
          `- Keep all facts, data, names, numbers, and technical details accurate ` +
          `- Do NOT fabricate information or add claims not in the source ` +
          `- Write complete paragraphs, not bullet points ` +
          `Article title: ${sourceTitle}. Source content: ${textContent}` +
          `\n\nNow write the rewritten article in clean plain text with H2 and H3 headings:`

        const result = await callOpenRouter(rewritePrompt, openRouterKey)
        if (result) rewrittenContent = result
      } catch (err: any) {
        console.error(`Rewrite failed: ${err.message}`)
      }

      try {
        const briefPrompt =
          `Summarize the following article into exactly 3 bullet points that capture the key information. ` +
          `Return ONLY valid JSON array with "text" property for each bullet. No markdown, no backticks, no code fences, no explanation. ` +
          `Example: [{"text":"First bullet"},{"text":"Second bullet"},{"text":"Third bullet"}] ` +
          `Article: ${sourceTitle}. ${textContent}`
        const result = await callOpenRouter(briefPrompt, openRouterKey)
        if (result) {
          const cleaned = result.replace(/```(?:json)?\s*|\s*```/gi, "").trim()
          quickBrief = JSON.parse(cleaned)
          if (!Array.isArray(quickBrief)) quickBrief = []
        }
      } catch (err: any) {
        console.error(`Quick brief failed: ${err.message}`)
      }

      try {
        const seoPrompt =
          `Generate SEO metadata for the following article. Return ONLY valid JSON with exactly these fields: ` +
          `"seo_title" (max 60 chars), "seo_description" (max 160 chars), "seo_keywords" (array of 5-10 strings). ` +
          `No markdown, no backticks, no code fences, no explanation. Article title: ${sourceTitle}. Content: ${textContent}`
        const result = await callOpenRouter(seoPrompt, openRouterKey)
        if (result) {
          const cleaned = result.replace(/```(?:json)?\s*|\s*```/gi, "").trim()
          seoData = JSON.parse(cleaned)
        }
      } catch (err: any) {
        console.error(`SEO generation failed: ${err.message}`)
      }

      try {
        const scorePrompt =
          `Rate this article's tech relevance on a scale of 1 to 100 ` +
          `(100 = extremely tech-relevant, 1 = not tech at all). ` +
          `Return ONLY a single integer. No explanation, no text, no code fences. Article: ${sourceTitle}. ${textContent}`
        const result = await callOpenRouter(scorePrompt, openRouterKey)
        if (result) {
          const cleaned = result.replace(/```\s*|\s*```/gi, "").trim()
          const parsed = parseInt(cleaned.replace(/\D/g, ""), 10)
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
            blizineScore = parsed
          }
        }
      } catch (err: any) {
        console.error(`Blizine score failed: ${err.message}`)
      }
    }

    const finalContent = rewrittenContent.includes('<')
      ? rewrittenContent
      : `<article><h2>${sourceTitle}</h2>${rewrittenContent
          .split(/\n{2,}/)
          .map(p => p.trim() ? `<p>${p}</p>` : '')
          .join('')
        }</article>`

    const updateData: Record<string, unknown> = {
      content: finalContent,
      quick_brief: quickBrief.length > 0 ? quickBrief : JSON.parse('[]'),
      ai_rewritten: true,
      status: 'published',
    }

    if (seoData.seo_title) updateData.seo_title = seoData.seo_title
    if (seoData.seo_description) updateData.seo_description = seoData.seo_description
    if (seoData.seo_keywords?.length) updateData.seo_keywords = seoData.seo_keywords
    if (blizineScore !== null) updateData.blizine_score = blizineScore

    const { error: updateError } = await supabase
      .from("posts")
      .update(updateData)
      .eq("id", post_id)

    if (updateError) {
      console.error(`Update failed: ${updateError.message}`)
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, blizine_score: blizineScore }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (err: any) {
    console.error(`Fatal: ${err.message}`)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
