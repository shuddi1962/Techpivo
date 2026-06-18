import { createClient } from '@/lib/supabase/admin'

const GEMINI_DAILY_CAP = 30
const MANUAL_GEMINI_DAILY_CAP = 20
const GEMINI_RATE_MS = 1000

export interface AIArticle {
  headline:          string
  content:           string
  answerCapsule:     string
  seoTitle:          string
  seoDescription:    string
  seoKeywords:       string[]
  focusKeyword:      string
  secondaryKeywords: string[]
  tags:              string[]
  keyPoints:         string[]
  quickBrief:        string[]
  faq:               Array<{ question: string; answer: string }>
  namedEntities:     string[]
  qualityScore:      number
  isBreaking:        boolean
  suggestedCategory: string
  modelUsed:         'gemini-grounded'
}

function buildPrompt(
  title: string,
  source: string,
  sourceName: string,
  category: string
): string {
  return `You are a senior technology journalist at Techpivo (techpivo.com), writing for an audience of professionals, developers, and informed tech enthusiasts.

ORIGINAL HEADLINE: ${title}
SOURCE PUBLICATION: ${sourceName}
CATEGORY: ${category}

SOURCE CONTENT — extract every fact, name, date, statistic, and quote:
${source.slice(0, 4500)}

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

ARTICLE STRUCTURE — use this exact HTML structure, in this order:

<section>
<div class="answer-capsule"><p>[MANDATORY 2-3 sentence direct answer. What happened, who, when, why it matters — written so Google AI Overviews, ChatGPT, and Perplexity can extract it verbatim.]</p></div>
</section>

<section>
<h2>[Opening section heading]</h2>
<p>[Opening paragraph: 2-3 sentences. Inverted pyramid — most important fact first.]</p>
</section>

<section>
<h2>[Context/Background heading]</h2>
<p>[Fact-dense paragraph with specific numbers, dates, named entities — critical GEO signals for AI citability.]</p>
</section>

<section>
<h2>[Main development heading]</h2>
<p>[Core story facts. Include named quote in blockquote format if source has one.]</p>
<blockquote>"[Exact quote text]" — Person Name, Title, Organisation</blockquote>
<ul>
<li>[Key detail 1]</li>
<li>[Key detail 2]</li>
<li>[Key detail 3]</li>
</ul>
</section>

<section>
<h2>What This Means</h2>
<p>[Original analysis — practical implications for the reader. Critical for E-E-A-T.]</p>
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

NAMED ENTITY DENSITY — include at least 5 named entities across the article (companies, people, products, technologies, places). Include at least 3 specific numbers, percentages, or dates.

WRITING STYLE:
- Write for a smart 16-year-old: clear, no unexplained jargon
- Explain every acronym on first use
- Average sentence length under 20 words
- BANNED phrases — NEVER use: "In today's fast-paced world", "It goes without saying", "At the end of the day", "Game-changing", "Revolutionary technology", "Leveraging synergies", "Deep dive", "Unpacking", "Delve into", "Paradigm shift", "In conclusion", "To summarize"
- Minimum 500 words, maximum 1000 words in the content field
- Use <strong> for ONE key fact per section

FAQ — generate exactly 4 questions:
- Phrased as a real person would type into Google or ask ChatGPT
- Start with What, How, Why, When, Is, Does, or Can
- Each answer: 2-3 sentences packed with specific facts
- Questions must be specific to THIS story, never generic

OUTPUT — valid JSON only. No markdown. No code fences. No preamble.
{
  "headline": "New headline 50-70 chars",
  "content": "<section>...full HTML content...</section>",
  "answerCapsule": "Plain text version of the answer capsule",
  "seoTitle": "55-60 char SEO title with primary keyword",
  "seoDescription": "140-155 char meta description with primary keyword",
  "seoKeywords": ["primary", "related1", "related2", "related3", "related4"],
  "focusKeyword": "primary keyword phrase",
  "secondaryKeywords": ["related1", "related2", "related3", "related4"],
  "tags": ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5"],
  "keyPoints": [
    "Verified fact 1 with number/date/name under 25 words",
    "Verified fact 2",
    "Verified fact 3"
  ],
  "quickBrief": [
    "Action-led point 1 max 18 words",
    "Action-led point 2",
    "Action-led point 3"
  ],
  "faq": [
    {"question": "Specific question 1?", "answer": "2-3 sentence factual answer."},
    {"question": "Specific question 2?", "answer": "2-3 sentence factual answer."},
    {"question": "Specific question 3?", "answer": "2-3 sentence factual answer."},
    {"question": "Specific question 4?", "answer": "2-3 sentence factual answer."}
  ],
  "namedEntities": ["Entity1", "Entity2", "Entity3", "Entity4", "Entity5"],
  "qualityScore": 85,
  "isBreaking": false,
  "suggestedCategory": "${category}"
}`
}

// ── VALIDATION ─────────────────────────────────────────────────────────────

const BANNED_PHRASES = [
  "in today's fast-paced",
  "it goes without saying",
  "at the end of the day",
  "game-changing",
  "revolutionary technology",
  "leveraging synergies",
  "deep dive",
  "Techpivo brings you",
  "check back for updates",
  "this story is developing",
  "our team of journalists",
  "needless to say",
  "unpacking",
  "delve into",
  "paradigm shift",
  "in conclusion",
  "to summarize",
]

const CORRECTIVE_PROMPTS: Record<string, string> = {
  no_h2_in_content:
    "Your previous response was rejected because there were no <h2> or <h3> section headings in the content. You MUST include at least one heading tag (`<h2>` or `<h3>`) to structure the article. Please regenerate with proper HTML section headings.",
  faq_too_few:
    "Your previous response was rejected because there weren't enough FAQ entries. You MUST include at least 2 FAQ items — each with a question longer than 5 characters and an answer longer than 10 characters.",
  keyPoints_too_few:
    "Your previous response was rejected because there weren't enough key points. You MUST include at least 2 key points, each longer than 10 characters.",
  content_too_short:
    "Your previous response was rejected because the content was too short. Please write a more comprehensive article (at least 300 characters).",
  missing_headline:
    "Your previous response was rejected because the 'headline' field was missing. Please include a headline.",
  missing_content:
    "Your previous response was rejected because the 'content' field was missing. Please include article content.",
}

function repairJson(str: string): string {
  return str
    .replace(/\/\/.*$/gm, '')               // strip // comments
    .replace(/\/\*[\s\S]*?\*\//g, '')       // strip /* */ comments
    .replace(/,\s*([}\]])/g, '$1')           // trailing commas before ] or }
    .replace(/([{,])\s*'([^']+?)'\s*:/g, '$1"$2":')  // single-quoted keys → double-quoted
    .replace(/:\s*'([^']*?)'\s*([,}])/g, ':"$1"$2')  // single-quoted strings → double-quoted
    .trim()
}

function validate(raw: string, model: AIArticle['modelUsed']): { article: AIArticle | null; reason: string } {
  if (!raw || raw.length < 100) { return { article: null, reason: `raw_too_short:${raw?.length || 0}` } }

  const clean = raw
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim()

  let jsonStr = clean
  let p: Record<string, any>
  try {
    p = JSON.parse(clean)
  } catch {
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) { return { article: null, reason: 'no_json_object_found' } }
    jsonStr = jsonMatch[0]
    try { p = JSON.parse(jsonMatch[0]) }
    catch {
      const repaired = repairJson(jsonMatch[0])
      try { p = JSON.parse(repaired) }
      catch { return { article: null, reason: 'json_parse_fail_after_object_extract' } }
    }
  }

  if (!p.headline) { return { article: null, reason: 'missing_headline' } }
  if (!p.content) { return { article: null, reason: 'missing_content' } }

  // Normalize markdown headings → <h2>, but preserve <h3> hierarchy
  let content = String(p.content)
    .replace(/^##\s+/gm, '<h2>')
    .trim()

  if (content.length < 100) { return { article: null, reason: `content_too_short:${content.length}` } }

  // Accept both <h2> and <h3> as valid section headings
  const hasHeading = content.includes('<h2') || content.includes('<h3')
  if (!hasHeading) {
    content = content
      // **text** at start of line → <h3>text</h3>
      .replace(/^\s*\*\*(.+?)\*\*/gm, '<h3>$1</h3>')
      // <strong>text</strong> at start of line → <h3>text</h3>
      .replace(/^\s*<strong>(.+?)<\/strong>/gim, '<h3>$1</h3>')
    // If still no heading, prepend a generic <h2>
    if (!content.includes('<h2') && !content.includes('<h3')) {
      content = '<h2>Overview</h2>\n' + content
    }
  }

  // Soft banned phrases: strip from content instead of rejecting
  const headline = String(p.headline).trim()
  let combined = (content + ' ' + headline).toLowerCase()
  for (const b of BANNED_PHRASES) {
    if (combined.includes(b)) {
      const escaped = b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      content = content.replace(new RegExp(escaped, 'gi'), '').trim()
      // Re-check after removal
      combined = (content + ' ' + headline).toLowerCase()
    }
  }

  // Accept alternate field names
  const rawFaq = p.faq ?? p.questions ?? p.FAQ ?? []
  const faq = Array.isArray(rawFaq)
    ? (rawFaq as Array<any>)
        .slice(0, 5)
        .map((f: any) => ({
          question: String(f?.question || f?.q || '').trim(),
          answer:   String(f?.answer   || f?.a || '').trim(),
        }))
        .filter((f: any) => f.question.length > 5 && f.answer.length > 10)
    : []

  if (faq.length < 1) { return { article: null, reason: `faq_too_few:${faq.length}` } }

  const rawKeyPoints = p.keyPoints ?? p.key_points ?? p.keypoints ?? []
  const keyPoints = Array.isArray(rawKeyPoints)
    ? (rawKeyPoints as string[]).slice(0, 5).map(String).filter(k => k.length > 10)
    : []

  if (keyPoints.length < 1) { return { article: null, reason: `keyPoints_too_few:${keyPoints.length}` } }

  const rawQuickBrief = p.quickBrief ?? p.quick_brief ?? []
  const quickBrief = Array.isArray(rawQuickBrief)
    ? (rawQuickBrief as string[]).slice(0, 3).map(String)
    : []

  return {
    article: {
      headline,
      content,
      answerCapsule:     String(p.answerCapsule || '').slice(0, 400),
      seoTitle:          String(p.seoTitle || p.headline).slice(0, 60),
      seoDescription:    String(p.seoDescription || '').slice(0, 155),
      seoKeywords:       Array.isArray(p.seoKeywords) ? (p.seoKeywords as string[]).slice(0, 5).map(String) : [],
      focusKeyword:      String(p.focusKeyword || '').slice(0, 60),
      secondaryKeywords: Array.isArray(p.secondaryKeywords) ? (p.secondaryKeywords as string[]).slice(0, 4).map(String) : [],
      tags:              Array.isArray(p.tags) ? (p.tags as string[]).slice(0, 5).map(String) : [],
      keyPoints,
      quickBrief,
      faq,
      namedEntities:     Array.isArray(p.namedEntities) ? (p.namedEntities as string[]).slice(0, 8).map(String) : [],
      qualityScore:      Math.min(100, Math.max(1, Number(p.qualityScore) || 70)),
      isBreaking:        Boolean(p.isBreaking),
      suggestedCategory: String(p.suggestedCategory || 'tech-news'),
      modelUsed:         model,
    },
    reason: 'ok',
  }
}

// ── GEMINI DAILY CAP ──────────────────────────────────────────────────────

async function getGeminiTodayCount(usedFor?: string): Promise<number> {
  try {
    const supabase = createClient()
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)

    let query = supabase
      .from('gemini_usage_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())

    if (usedFor) {
      query = query.eq('used_for', usedFor)
    }

    const { count } = await query
    return count || 0
  } catch {
    console.warn('[Techpivo AI] Could not check Gemini usage count — defaulting to cap reached')
    return GEMINI_DAILY_CAP
  }
}

async function logGeminiUsage(headline: string, usedFor: string): Promise<void> {
  try {
    const supabase = createClient()
    await supabase.from('gemini_usage_log').insert({
      used_for:   usedFor,
      headline:   headline.slice(0, 150),
      model:      'gemini-2.5-flash-grounded',
      created_at: new Date().toISOString(),
    })
  } catch (e) {
    console.warn('[Techpivo AI] Could not log Gemini usage:', e)
  }
}

// ── GEMINI 2.5 FLASH + GOOGLE SEARCH GROUNDING ───────────────────────────

let lastGeminiCallTime = 0

async function geminiGrounded(
  prompt:  string,
  usedFor: string,
  dailyCap?: number
): Promise<{ article: AIArticle | null; debug: string }> {
  if (!process.env.GEMINI_API_KEY) {
    console.log('[Techpivo AI] No GEMINI_API_KEY set')
    return { article: null, debug: 'no_key' }
  }

  const cap = dailyCap ?? GEMINI_DAILY_CAP
  const usedForFilter = dailyCap ? usedFor : undefined
  const todayCount = await getGeminiTodayCount(usedForFilter)
  if (todayCount >= cap) {
    console.log(`[Techpivo AI] Gemini ${usedFor} cap reached (${todayCount}/${cap}) — skipping`)
    return { article: null, debug: 'cap_reached' }
  }

  const now = Date.now()
  const elapsed = now - lastGeminiCallTime
  if (elapsed < GEMINI_RATE_MS) {
    await new Promise(r => setTimeout(r, GEMINI_RATE_MS - elapsed))
  }
  lastGeminiCallTime = Date.now()

  const maxRetries = 2
  let lastDebug = ''
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`
      const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature:     0.45,
          maxOutputTokens: 8192,
        },
        tools: [{ googleSearch: {} }],
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(25000),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        if (attempt < maxRetries && (res.status === 429 || res.status === 503)) {
          console.warn(`[Gemini retry ${attempt + 1}] HTTP ${res.status}`)
          await new Promise(r => setTimeout(r, 2000))
          continue
        }
        return { article: null, debug: `http_${res.status}:${errText.slice(0, 150)}` }
      }

      const data = await res.json()
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (!raw || raw.length < 100) {
        const reason = data?.candidates?.[0]?.finishReason || 'NO_CANDIDATE'
        return { article: null, debug: `empty:${reason}/len=${raw.length}` }
      }

      const { article, reason } = validate(raw, 'gemini-grounded')

      if (article) {
        await logGeminiUsage(article.headline, usedFor)
        console.log(`[✓ Gemini+Search ${todayCount + 1}/${cap}] ${article.headline.slice(0, 60)} (${usedFor})`)
        return { article, debug: 'ok' }
      }

      // Corrective retry: if validate had a fixable issue, give Gemini a second chance
      lastDebug = `validate:${reason}`
      const corrective = CORRECTIVE_PROMPTS[reason]
      if (corrective && attempt < maxRetries) {
        console.warn(`[Gemini corrective ${attempt + 1}/${maxRetries}] ${reason} — retrying`)
        prompt = prompt + '\n\n⚠️ CORRECTION: ' + corrective
        await new Promise(r => setTimeout(r, 1500))
        continue
      }

      return { article: null, debug: lastDebug }

    } catch (e: any) {
      const msg = String(e)
      if (attempt < maxRetries && (msg.includes('Timeout') || msg.includes('timeout') || msg.includes('aborted') || msg.includes('FETCH_ERROR'))) {
        console.warn(`[Gemini retry ${attempt + 1}] ${msg.slice(0, 80)}`)
        await new Promise(r => setTimeout(r, 1000))
        continue
      }
      return { article: null, debug: `error:${msg.slice(0, 150)}` }
    }
  }

  return { article: null, debug: lastDebug || 'retries_exhausted' }
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────

export async function rewriteArticle(
  title:         string,
  sourceContent: string,
  sourceName:    string,
  category:      string,
  usedFor:       'rss_auto' | 'manual' = 'rss_auto'
): Promise<{ article: AIArticle | null; debug: string }> {
  if (!title || title.trim().length < 5)            return { article: null, debug: 'short_title' }
  if (!sourceContent || sourceContent.trim().length < 40) return { article: null, debug: 'short_source' }

  const prompt = buildPrompt(title, sourceContent, sourceName, category)

  return await geminiGrounded(prompt, usedFor)
}

// ── QUOTA STATUS ──────────────────────────────────────────────────────────

export async function getGeminiQuotaStatus(): Promise<{
  used:         number
  cap:          number
  remaining:    number
  manualUsed:   number
  manualCap:    number
  manualRemaining: number
  resetsAt:     string
  canUseGemini: boolean
  canUseManualGemini: boolean
}> {
  const used          = await getGeminiTodayCount()
  const manualUsed    = await getGeminiTodayCount('manual')
  const remaining     = Math.max(0, GEMINI_DAILY_CAP - used)
  const manualRemaining = Math.max(0, MANUAL_GEMINI_DAILY_CAP - manualUsed)
  const tomorrow  = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)

  return {
    used,
    cap:          GEMINI_DAILY_CAP,
    remaining,
    manualUsed,
    manualCap:    MANUAL_GEMINI_DAILY_CAP,
    manualRemaining,
    resetsAt:     tomorrow.toUTCString(),
    canUseGemini: remaining > 0,
    canUseManualGemini: manualRemaining > 0,
  }
}

// ── ADMIN MANUAL WRITE (topic / URL) ─────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim()
}

function buildManualPrompt(input: string, inputType: "topic" | "url" | "content", sourceName?: string): string {
  const sourceSection = inputType === "topic"
    ? `TOPIC TO RESEARCH AND WRITE ABOUT:\n${input}`
    : inputType === "url"
    ? `SOURCE URL TO RESEARCH:\n${input}\n\nUse Google Search to find everything about this story.`
    : `SOURCE CONTENT FROM ${sourceName || "a tech publication"}:\n${input.slice(0, 4000)}`

  return `You are a senior tech journalist writing for Techpivo (techpivo.com), a premium technology news blog.

${sourceSection}

INSTRUCTIONS:
1. Research this topic thoroughly using Google Search — find latest facts, quotes, context
2. Write a complete, factual, engaging tech article
3. Write a compelling NEW headline
4. Write 6-8 paragraphs totalling 700-900 words
5. Use inverted pyramid: most important facts first
6. Include real names, dates, numbers, and quotes from your research
7. Explain WHY this story matters to tech readers
8. Include a "What This Means" analysis section
9. End with a forward-looking "What's Next" section
10. Format content as HTML: use <p> for paragraphs, <h2> or <h3> for section headings, <strong> for key terms
11. Do NOT mention Techpivo in the article body
12. Do NOT write "In conclusion" or "To summarize"
13. Do NOT use phrases like "In today's fast-paced tech world"
14. Be specific — avoid vague generalisations
15. You MUST include at least one heading (<h2> or <h3>) in the content field

KEY POINTS (separate JSON field):
- 3 to 5 short strings, each under 25 words, one verified fact each

QUICK BRIEF (separate JSON field — 3 bullets shown above article):
- Exactly 3 bullets, max 18 words each, starts with verb or number

FAQ (3 questions):
- Real questions readers would search on Google, answered from article facts only
- Each question must be longer than 5 characters
- Each answer must be longer than 10 characters

SUGGESTED CATEGORY — pick exactly one:
tech-news | ai-automation | cybersecurity | gadgets | programming |
web-development | tutorials | digital-business | networking-it | reviews | desktops

Return ONLY valid JSON — no markdown, no code blocks, no explanation:
{
  "headline": "Compelling headline here",
  "content": "<p>Lead paragraph summarizing key news.</p><h2>Key Developments</h2><p>Detailed facts, quotes, context.</p><p>More analysis.</p><h2>What This Means</h2><p>Why it matters to tech readers.</p><h2>What's Next</h2><p>Forward-looking takeaway.</p><h2>Key Points</h2><ul><li>Fact 1</li><li>Fact 2</li><li>Fact 3</li></ul><h2>The Bottom Line</h2><p>Final summary sentence.</p>",
  "seoTitle": "60 char max SEO title",
  "seoDescription": "155 char max meta description with focus keyword",
  "seoKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "tags": ["Tag1", "Tag2", "Tag3", "Tag4"],
  "keyPoints": [
    "Specific verified fact one under 25 words",
    "Specific verified fact two",
    "Specific verified fact three"
  ],
  "quickBrief": [
    "First key takeaway max 18 words",
    "Second key takeaway max 18 words",
    "Third key takeaway max 18 words"
  ],
  "faq": [
    {"question": "Specific reader question?", "answer": "Direct factual answer."},
    {"question": "Another specific question?", "answer": "Direct factual answer."},
    {"question": "Third question?", "answer": "Direct factual answer."}
  ],
  "qualityScore": 85,
  "isBreaking": false,
  "suggestedCategory": "tech-news"
}`
}

export async function manualWriteFromTopic(topic: string): Promise<{ article: AIArticle | null; debug: string }> {
  if (!topic || topic.length < 5) return { article: null, debug: 'topic_too_short' }
  console.log(`[Techpivo Manual] Writing from topic: ${topic.slice(0, 60)}`)

  const prompt = buildManualPrompt(topic, "topic")
  const result = await geminiGrounded(prompt, 'manual', MANUAL_GEMINI_DAILY_CAP)
  if (result.article) {
    console.log(`[✓ Gemini+Search] ${result.article.headline.slice(0, 55)}`)
    return result
  }

  console.error(`[✗ ALL FAILED] Topic: ${topic.slice(0, 50)} — ${result.debug}`)
  return result
}

export async function manualWriteFromUrl(url: string): Promise<{ article: AIArticle | null; debug: string }> {
  if (!url || !url.startsWith("http")) return { article: null, debug: 'invalid_url' }
  console.log(`[Techpivo Manual] Writing from URL: ${url.slice(0, 80)}`)

  let sourceContent = ""
  let sourceName = new URL(url).hostname.replace("www.", "")
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Techpivo/1.0; +https://techpivo.com/bot)" },
      signal: AbortSignal.timeout(10000),
    })
    const html = await res.text()
    for (const pattern of [
      /<article[\s>]([\s\S]*?)<\/article>/i,
      /<div[^>]+class=["'][^"']*(?:article-body|post-content|entry-content|story-body)[^"']*["'][^>]*>([\s\S]{400,}?)<\/div>/i,
      /<main[\s>]([\s\S]*?)<\/main>/i,
    ]) {
      const m = html.match(pattern)
      if (m?.[1]) {
        sourceContent = m[1]
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 4000)
        if (sourceContent.length > 200) break
      }
    }

    const siteNameMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)
    if (siteNameMatch?.[1]) sourceName = siteNameMatch[1]
  } catch {
    console.warn(`[Techpivo Manual] Could not pre-fetch ${url}, relying on Gemini grounding`)
  }

  const input = sourceContent.length > 200 ? sourceContent : url
  const inputType = sourceContent.length > 200 ? "content" : "url"

  const prompt = buildManualPrompt(input, inputType, sourceName)
  const result = await geminiGrounded(prompt, 'manual', MANUAL_GEMINI_DAILY_CAP)
  if (result.article) {
    console.log(`[✓ Gemini+Search] ${result.article.headline.slice(0, 55)}`)
    return result
  }

  console.error(`[✗ ALL FAILED] URL: ${url.slice(0, 60)} — ${result.debug}`)
  return result
}

export async function geminiRewriteContent(title: string, content: string): Promise<string> {
  const textContent = stripHtml(content)
  if (!textContent || textContent.length < 50) return content

  const todayCount = await getGeminiTodayCount()
  if (todayCount >= GEMINI_DAILY_CAP) {
    console.warn(`[Techpivo AI] Gemini daily cap reached (${todayCount}/${GEMINI_DAILY_CAP}) — skipping rewrite`)
    return content
  }

  const rewritePrompt =
    "You are a senior tech journalist writing for Techpivo (techpivo.com), a premium technology news blog.\n\n" +
    "Rewrite the following tech article in an engaging, SEO-optimized style.\n\n" +
    "INSTRUCTIONS:\n" +
    "- Write a complete, self-contained article (minimum 600 words)\n" +
    "- Start with a compelling hook that grabs attention\n" +
    "- Use inverted pyramid: most important facts first\n" +
    "- Use H2/H3 subheadings to structure the piece\n" +
    "- Include specific details, dates, numbers, and quotes where possible\n" +
    "- Explain WHY this matters and include a forward-looking perspective\n" +
    "- Output ONLY valid HTML — no markdown, no code fences\n" +
    "- Use <p> for paragraphs, <h2>/<h3> for subheadings, <strong> for emphasis\n" +
    "- Do NOT mention Techpivo in the article body\n" +
    "- Do NOT use phrases like 'In conclusion', 'To summarize', or 'In today's fast-paced world'\n\n" +
    "Article title: " + title + "\n\nOriginal content:\n" + textContent

  if (process.env.GEMINI_API_KEY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: rewritePrompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 4096 },
        }),
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) { console.warn('[Techpivo] Gemini rewrite HTTP', res.status); return content }
      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
      if (text.length > 300) {
        await logGeminiUsage(title, 'rewrite')
        console.log(`[✓ Gemini Rewrite] ${title.slice(0, 40)}`)
        return text
      }
    } catch (e) {
      console.warn("[Techpivo] Gemini rewrite failed:", e)
    }
  }

  console.warn(`[✗ Rewrite ALL FAILED] ${title.slice(0, 40)} — returning original`)
  return content
}
