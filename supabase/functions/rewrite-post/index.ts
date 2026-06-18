import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface QuickBriefItem { text: string }

interface SEOData {
  seo_title?: string
  seo_description?: string
  seo_keywords?: string[]
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] }
    finishReason?: string
  }[]
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&#\d+;/g, m => String.fromCharCode(parseInt(m.slice(2, -1))))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#x2F;/g, '/')
    .trim()
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.45, maxOutputTokens: 8192 },
    tools: [{ googleSearch: {} }],
  }
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  })
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "")
    throw new Error(`Gemini API error (${response.status}): ${errorBody.slice(0, 200)}`)
  }
  const data: GeminiResponse = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ""
  if (!text) {
    const reason = data.candidates?.[0]?.finishReason || "NO_CANDIDATE"
    throw new Error(`Gemini empty response: ${reason}`)
  }
  return text
}

async function fetchOriginalContent(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { "User-Agent": "Techpivo/1.0" },
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

function buildRewritePrompt(sourceTitle: string, textContent: string): string {
  return `You are a senior technology journalist at Techpivo (techpivo.com), writing for an audience of professionals, developers, and informed tech enthusiasts.

ORIGINAL HEADLINE: ${sourceTitle}
SOURCE CONTENT — extract every fact, name, date, statistic, and quote:
${textContent.slice(0, 4500)}

Use Google Search to verify and expand on this story with the latest available information. Cross-check facts before including them.

GOOGLE POLICY COMPLIANCE — MANDATORY, NO EXCEPTIONS
- Never copy sentences verbatim from the source — full rewrite required
- Never present speculation as confirmed fact
- Never include misleading claims about products, companies, or people
- Never use sensational or clickbait framing
- Every claim must be attributable to a named source
- Content must provide genuine added value beyond the original report

HEADLINE
- Completely new wording — never copy the original headline
- Active voice, present or past tense
- Include the most newsworthy fact directly in the headline
- 50-70 characters, no clickbait

ARTICLE STRUCTURE — use this exact HTML structure in this order:
<section>
<div class="answer-capsule"><p>[MANDATORY: 2-3 sentence direct answer. What happened, who, when, why it matters — written so Google AI Overviews and ChatGPT can extract it.]</p></div>
</section>

<section>
<h2>[Opening section heading]</h2>
<p>[Opening paragraph: 2-3 sentences. Inverted pyramid — most important fact first.]</p>
</section>

<section>
<h2>[Context/Background heading]</h2>
<p>[Fact-dense paragraph with specific numbers, dates, named entities]</p>
</section>

<section>
<h2>[Main development heading]</h2>
<p>[Core story facts with details]</p>
<blockquote>"[Exact quote from named source]" — Person Name, Title, Organisation</blockquote>
<p>[Supporting details]</p>
<ul>
<li>[Key detail 1]</li>
<li>[Key detail 2]</li>
<li>[Key detail 3]</li>
</ul>
</section>

<section>
<h2>What This Means</h2>
<p>[Original analysis — practical implications for the reader. What differentiates Techpivo from pure aggregation.]</p>
</section>

<section>
<h2>Key Points</h2>
<ul>
<li>[Verified fact 1 with specific number/date/name]</li>
<li>[Verified fact 2]</li>
<li>[Verified fact 3]</li>
</ul>
</section>

<section>
<h2>The Bottom Line</h2>
<p>[2-3 sentences. Practical takeaway. What to watch for next.]</p>
</section>

WRITING RULES:
- Write for a smart 16-year-old: clear, no unexplained jargon
- Explain every acronym on first use
- Average sentence length under 20 words
- Include at least 5 named entities and 3 specific numbers/dates
- BANNED phrases — NEVER use: "In today's fast-paced world", "It goes without saying", "At the end of the day", "Game-changing", "Revolutionary technology", "Leveraging synergies", "Deep dive", "Unpacking", "Delve into", "Paradigm shift", "In conclusion", "To summarize"
- Minimum 500 words, maximum 1000 words
- Use <strong> for ONE key fact per section

OUTPUT — valid JSON only. No markdown. No code fences. No preamble.
{
  "headline": "New headline 50-70 chars",
  "content": "<section>...full HTML content...</section>",
  "seoTitle": "55-60 char SEO title",
  "seoDescription": "140-155 char meta description",
  "seoKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "keyPoints": [
    "Verified fact 1 under 25 words",
    "Verified fact 2",
    "Verified fact 3"
  ],
  "quickBrief": [
    "Action-led point 1 max 18 words",
    "Action-led point 2",
    "Action-led point 3"
  ],
  "qualityScore": 85,
  "faq": [
    {"question": "Specific real reader question?", "answer": "2-3 sentence factual answer from article."},
    {"question": "Second specific question?", "answer": "2-3 sentence factual answer."},
    {"question": "Third specific question?", "answer": "2-3 sentence factual answer."}
  ]
}`
}

function extractJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/im, '').trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) throw new Error("No JSON object found in response")
  return JSON.parse(match[0])
}

serve(async (req) => {
  try {
    const { post_id } = await req.json()
    if (!post_id) {
      return new Response(JSON.stringify({ error: "post_id is required" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    const geminiKey = Deno.env.get("GEMINI_API_KEY") || ""

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Supabase credentials not configured" }), {
        status: 500, headers: { "Content-Type": "application/json" },
      })
    }
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not set in edge function secrets" }), {
        status: 500, headers: { "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: post, error: fetchError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", post_id)
      .single()

    if (fetchError || !post) {
      return new Response(JSON.stringify({ error: fetchError?.message || "Post not found" }), {
        status: 404, headers: { "Content-Type": "application/json" },
      })
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
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`Failed to fetch original content: ${msg}`)
      }
    }

    const textContent = stripHtml(sourceContent)
    if (textContent.length < 50) {
      return new Response(JSON.stringify({ error: "Source content too short" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      })
    }

    let headline = sourceTitle
    let rewrittenContent = textContent
    let quickBrief: QuickBriefItem[] = []
    let seoData: SEOData = {}
    let qualityScore: number | null = null
    let faqResult: Array<{ question: string; answer: string }> = []
    let keyPointsResult: string[] = []
    let seoKeywords: string[] = []

    try {
      const prompt = buildRewritePrompt(sourceTitle, textContent)
      const result = await callGemini(prompt, geminiKey)
      const parsed = extractJson(result)

      if (parsed.headline) headline = String(parsed.headline).trim()
      if (parsed.content) rewrittenContent = String(parsed.content).trim()
      if (parsed.seoTitle) seoData.seo_title = String(parsed.seoTitle).slice(0, 60)
      if (parsed.seoDescription) seoData.seo_description = String(parsed.seoDescription).slice(0, 155)
      if (Array.isArray(parsed.seoKeywords)) {
        seoKeywords = (parsed.seoKeywords as string[]).slice(0, 5).map(String)
        seoData.seo_keywords = seoKeywords
      }
      if (Array.isArray(parsed.quickBrief)) {
        quickBrief = (parsed.quickBrief as string[]).slice(0, 3).map(t => ({ text: String(t) }))
      }
      if (Array.isArray(parsed.keyPoints)) {
        keyPointsResult = (parsed.keyPoints as string[]).slice(0, 5).map(String)
      }
      if (Array.isArray(parsed.faq)) {
        faqResult = (parsed.faq as Array<{ question: string; answer: string }>).slice(0, 5)
          .filter(f => f?.question?.length > 5 && f?.answer?.length > 10)
      }
      if (parsed.qualityScore) {
        qualityScore = Math.min(100, Math.max(1, Number(parsed.qualityScore)))
      }

      console.log(`[✓ Gemini grounded rewrite] ${headline.slice(0, 60)}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`Gemini rewrite failed: ${msg}`)
    }

    const finalContent = rewrittenContent.includes("<h2") || rewrittenContent.includes("<h3")
      ? rewrittenContent
      : `<section><h2>${headline}</h2>${rewrittenContent
          .split(/\n{2,}/)
          .map(p => p.trim() ? `<p>${p}</p>` : '')
          .join('')
        }</section>`

    const updateData: Record<string, unknown> = {
      title: headline,
      content: finalContent,
      quick_brief: quickBrief.length > 0 ? quickBrief : [],
      ai_rewritten: true,
      status: 'published',
      model_used: 'gemini-grounded',
    }

    if (seoData.seo_title) updateData.seo_title = seoData.seo_title
    if (seoData.seo_description) updateData.seo_description = seoData.seo_description
    if (seoKeywords.length > 0) updateData.seo_keywords = seoKeywords
    if (keyPointsResult.length > 0) updateData.key_points = keyPointsResult
    if (faqResult.length > 0) updateData.faq = faqResult
    if (qualityScore !== null) updateData.quality_score = qualityScore

    const { error: updateError } = await supabase
      .from("posts")
      .update(updateData)
      .eq("id", post_id)

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500, headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ success: true, quality_score: qualityScore }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`Fatal: ${msg}`)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { "Content-Type": "application/json" },
    })
  }
})
