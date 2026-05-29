import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/admin'

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })

const GEMINI_DAILY_CAP = 20
const GEMINI_RATE_MS = 10_000

export interface BlizineArticle {
  headline:          string
  content:           string
  seoTitle:          string
  seoDescription:    string
  seoKeywords:       string[]
  tags:              string[]
  keyPoints:         string[]
  quickBrief:        string[]
  faq:               Array<{ question: string; answer: string }>
  blizineScore:      number
  isBreaking:        boolean
  suggestedCategory: string
  modelUsed:         'gemini-grounded'
}

function buildPrompt(
  title: string,
  sourceContent: string,
  sourceName: string,
  category: string
): string {
  return `You are a senior tech journalist writing for Blizine (blizine.com), a premium technology news blog trusted by engineers, designers, and tech enthusiasts.

ORIGINAL HEADLINE: ${title}
SOURCE PUBLICATION: ${sourceName}
CATEGORY: ${category}

SOURCE CONTENT (use every fact, name, date, number, and quote from this):
${sourceContent.slice(0, 4500)}

═══════════════════════════════════════════════════
MANDATORY WRITING RULES — violating any rule = article rejected
═══════════════════════════════════════════════════

HEADLINE RULES:
✓ Write a completely new headline. Do not copy the original even partially.
✓ Active voice. Present or past tense. Maximum 90 characters.
✓ Contains the single most important fact from the article.
✗ No "You won't believe...", "This changes everything", "Game changer"
✗ No questions as headlines unless genuinely investigative

LANGUAGE RULES:
✓ Write for a smart 16-year-old. Clear. Precise. No padding.
✓ Explain every acronym on first use: "API (Application Programming Interface)"
✓ Average sentence length: under 20 words
✓ Verified facts only. If something is unconfirmed, say "reportedly" or "according to"
✗ BANNED phrases — if any appear, the article is rejected:
  "In today's fast-paced world", "It goes without saying", "At the end of the day",
  "Game-changing", "Revolutionary technology", "Leveraging synergies", "Deep dive",
  "Blizine brings you", "Check back for updates", "This story is developing",
  "Our team of journalists", "Needless to say", "In conclusion", "To summarize",
  "Unpacking", "Delve into", "Paradigm shift"

STRUCTURE — use this exact HTML structure, in this exact order:

<section>
<h2>[Opening paragraph heading]</h2>
<p>[Opening: 2-3 sentences. The single most important fact first. Why it matters. No jargon.]</p>
</section>

<section>
<h2>[First major section heading]</h2>
<p>[Section content — max 4 sentences, one clear idea per paragraph]</p>
<h3>[Sub-point heading if breaking down detail]</h3>
<p>[Sub-point content]</p>
</section>

<section>
<h2>[Second major section heading]</h2>
<p>[Content]</p>
<ul>
<li>[Use bullet points when listing features, steps or comparisons. Max 6 bullets. Each: one clear fact, max 20 words.]</li>
</ul>
</section>

<blockquote>
[Use ONLY if source has a direct named quote. Format: "Quote text." — Person Name, Title, Organisation]
</blockquote>

<section>
<h2>Key Points</h2>
<ul>
<li>[Key fact 1 — specific, verified, from the article]</li>
<li>[Key fact 2]</li>
<li>[Key fact 3]</li>
</ul>
</section>

<section>
<h2>The Bottom Line</h2>
<p>[2-3 sentences. Practical takeaway. What does this mean for the reader right now?]</p>
</section>

FORMATTING RULES:
- Use <strong> for ONE key fact or number per section — not for decoration
- Every paragraph separated by a blank line
- Minimum 3 H2 headings per article (including Key Points and The Bottom Line)
- Target length: 500-750 words

SEO META:
- seoTitle: 55-60 characters, includes the main keyword naturally
- seoDescription: 140-155 characters, written for humans not robots, includes keyword

KEY POINTS (separate JSON field, mirrors the Key Points H2):
- 3 to 5 short strings
- Each: one verified fact, under 25 words
- Starts with a noun or number
- No "According to..." — just the fact

QUICK BRIEF (separate JSON field — 3 bullets shown above article):
- Exactly 3 bullets
- Each: max 18 words
- Starts with an action verb or number
- Covers the 3 most important facts

FAQ (3 to 5 questions):
- Real questions a reader would actually search on Google
- Questions must be specific to THIS article's facts, not generic
- Answered directly from the article facts only
- Each answer: 2-3 sentences max

BLIZINE SCORE:
- Rate 1-100 how newsworthy and relevant this is for a tech audience
- 90-100: major breaking news, industry-shifting announcement
- 75-89:  strong story, clearly relevant to tech readers
- 55-74:  solid but not urgent
- Below 55: evergreen or tutorial content

SUGGESTED CATEGORY — pick exactly one:
tech-news | ai-automation | cybersecurity | gadgets | programming |
web-development | tutorials | digital-business | networking-it | reviews | desktops

═══════════════════════════════════════════════════
OUTPUT — ONLY valid JSON, zero other text, zero markdown, zero code blocks
═══════════════════════════════════════════════════
{
  "headline": "New specific headline here",
  "content": "<section><h2>Opening...</h2><p>Content...</p></section><section><h2>Section</h2><p>Content...</p></section><section><h2>Key Points</h2><ul><li>Fact 1</li><li>Fact 2</li><li>Fact 3</li></ul></section><section><h2>The Bottom Line</h2><p>Takeaway.</p></section>",
  "seoTitle": "55-60 char SEO title with keyword",
  "seoDescription": "140-155 char meta description written for humans, includes main keyword",
  "seoKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "tags": ["Tag1", "Tag2", "Tag3", "Tag4"],
  "keyPoints": [
    "Specific verified fact one from the article in under 25 words",
    "Specific verified fact two",
    "Specific verified fact three"
  ],
  "quickBrief": [
    "Action verb + key fact one, max 18 words",
    "Action verb + key fact two, max 18 words",
    "Action verb + key fact three, max 18 words"
  ],
  "faq": [
    {"question": "Specific question a reader would search?", "answer": "Direct 2-3 sentence answer from article facts only."},
    {"question": "Another specific reader question?", "answer": "Direct answer."},
    {"question": "Third specific question?", "answer": "Direct answer."}
  ],
  "blizineScore": 82,
  "isBreaking": false,
  "suggestedCategory": "tech-news"
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
  "blizine brings you",
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

function validate(raw: string, model: BlizineArticle['modelUsed']): BlizineArticle | null {
  if (!raw || raw.length < 100) return null

  const clean = raw
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim()

  let p: Record<string, any>
  try {
    p = JSON.parse(clean)
  } catch {
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    try { p = JSON.parse(jsonMatch[0]) }
    catch { return null }
  }

  if (!p.headline || !p.content) return null
  if (typeof p.content !== 'string' || p.content.length < 300) return null

  if (!p.content.includes('<h2')) return null

  const contentLower = (p.content + ' ' + p.headline).toLowerCase()
  if (BANNED_PHRASES.some(b => contentLower.includes(b))) {
    console.warn('[Blizine AI] Banned phrase detected — rejecting article')
    return null
  }

  const faq = Array.isArray(p.faq)
    ? (p.faq as Array<any>)
        .slice(0, 5)
        .map((f: any) => ({
          question: String(f?.question || '').trim(),
          answer:   String(f?.answer   || '').trim(),
        }))
        .filter((f: any) => f.question.length > 5 && f.answer.length > 10)
    : []

  if (faq.length < 2) return null

  const keyPoints = Array.isArray(p.keyPoints)
    ? (p.keyPoints as string[]).slice(0, 5).map(String).filter(k => k.length > 10)
    : []

  if (keyPoints.length < 2) return null

  return {
    headline:          String(p.headline).trim().slice(0, 150),
    content:           String(p.content).trim(),
    seoTitle:          String(p.seoTitle || p.headline).slice(0, 60),
    seoDescription:    String(p.seoDescription || '').slice(0, 155),
    seoKeywords:       Array.isArray(p.seoKeywords) ? (p.seoKeywords as string[]).slice(0, 5).map(String) : [],
    tags:              Array.isArray(p.tags) ? (p.tags as string[]).slice(0, 5).map(String) : [],
    keyPoints,
    quickBrief:        Array.isArray(p.quickBrief) ? (p.quickBrief as string[]).slice(0, 3).map(String) : [],
    faq,
    blizineScore:      Math.min(100, Math.max(1, Number(p.blizineScore) || 70)),
    isBreaking:        Boolean(p.isBreaking),
    suggestedCategory: String(p.suggestedCategory || 'tech-news'),
    modelUsed:         model,
  }
}

// ── GEMINI DAILY CAP ──────────────────────────────────────────────────────

async function getGeminiTodayCount(): Promise<number> {
  try {
    const supabase = createClient()
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('gemini_usage_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())

    return count || 0
  } catch {
    console.warn('[Blizine AI] Could not check Gemini usage count — defaulting to cap reached')
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
    console.warn('[Blizine AI] Could not log Gemini usage:', e)
  }
}

// ── GEMINI 2.5 FLASH + GOOGLE SEARCH GROUNDING ───────────────────────────

let lastGeminiCallTime = 0

async function geminiGrounded(
  prompt:  string,
  usedFor: string
): Promise<BlizineArticle | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[Blizine AI] No GEMINI_API_KEY set')
    return null
  }

  const todayCount = await getGeminiTodayCount()
  if (todayCount >= GEMINI_DAILY_CAP) {
    console.log(`[Blizine AI] Gemini daily cap reached (${todayCount}/${GEMINI_DAILY_CAP}) — skipping`)
    return null
  }

  const now = Date.now()
  const elapsed = now - lastGeminiCallTime
  if (elapsed < GEMINI_RATE_MS) {
    await new Promise(r => setTimeout(r, GEMINI_RATE_MS - elapsed))
  }
  lastGeminiCallTime = Date.now()

  try {
    const result = await genai.models.generateContent({
      model:    'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature:     0.45,
        maxOutputTokens: 4096,
        tools:           [{ googleSearch: {} }],
      },
    })

    const raw = result.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!raw || raw.length < 100) {
      const reason = result.candidates?.[0]?.finishReason || 'NO_CANDIDATE'
      console.warn(`[Blizine AI] Gemini returned empty/short response (${reason}, len=${raw.length})`)
      return null
    }

    const article = validate(raw, 'gemini-grounded')

    if (article) {
      await logGeminiUsage(article.headline, usedFor)
      console.log(`[✓ Gemini+Search ${todayCount + 1}/${GEMINI_DAILY_CAP}] ${article.headline.slice(0, 60)}`)
    } else {
      console.warn(`[Blizine AI] validate() rejected response (len=${raw.length}, h2=${raw.includes('<h2')}, start=${raw.slice(0,80).replace(/\n/g,' ')})`)
    }

    return article

  } catch (e: any) {
    const msg = String(e)
    if (msg.includes('429') || msg.includes('quota') || msg.includes('RATE_LIMIT')) {
      console.warn(`[Blizine AI] Gemini 429 hit — quota exhausted for today`)
    } else {
      console.warn('[Blizine AI] Gemini Grounded error:', msg.slice(0, 120))
    }
    return null
  }
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────

export async function rewriteArticle(
  title:         string,
  sourceContent: string,
  sourceName:    string,
  category:      string,
  usedFor:       'rss_auto' | 'manual' = 'rss_auto'
): Promise<BlizineArticle | null> {
  if (!title || title.trim().length < 5)            return null
  if (!sourceContent || sourceContent.trim().length < 40) return null

  const prompt = buildPrompt(title, sourceContent, sourceName, category)

  const article = await geminiGrounded(prompt, usedFor)

  if (article) return article

  console.log(`[Blizine] Gemini cap reached or failed — skipping article: ${title.slice(0, 60)}`)
  return null
}

// ── QUOTA STATUS ──────────────────────────────────────────────────────────

export async function getGeminiQuotaStatus(): Promise<{
  used:         number
  cap:          number
  remaining:    number
  resetsAt:     string
  canUseGemini: boolean
}> {
  const used      = await getGeminiTodayCount()
  const remaining = Math.max(0, GEMINI_DAILY_CAP - used)
  const tomorrow  = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)

  return {
    used,
    cap:          GEMINI_DAILY_CAP,
    remaining,
    resetsAt:     tomorrow.toUTCString(),
    canUseGemini: remaining > 0,
  }
}

// ── ADMIN MANUAL WRITE (topic / URL) ─────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim()
}

function buildBlizinePrompt(input: string, inputType: "topic" | "url" | "content", sourceName?: string): string {
  const sourceSection = inputType === "topic"
    ? `TOPIC TO RESEARCH AND WRITE ABOUT:\n${input}`
    : inputType === "url"
    ? `SOURCE URL TO RESEARCH:\n${input}\n\nUse Google Search to find everything about this story.`
    : `SOURCE CONTENT FROM ${sourceName || "a tech publication"}:\n${input.slice(0, 4000)}`

  return `You are a senior tech journalist writing for Blizine (blizine.com), a premium technology news blog.

${sourceSection}

INSTRUCTIONS:
1. Research this topic thoroughly using Google Search — find latest facts, quotes, context
2. Write a complete, factual, engaging tech article
3. Write a compelling NEW headline
4. Write exactly 6 paragraphs totalling 600-800 words
5. Use inverted pyramid: most important facts first
6. Include real names, dates, numbers, and quotes from your research
7. Explain WHY this story matters to tech readers
8. Include a "What This Means" analysis paragraph
9. End with a forward-looking "What's Next" paragraph
10. Format content as HTML: use <p> tags for paragraphs, <h3> for subheadings, <strong> for key terms
11. Do NOT mention Blizine in the article body
12. Do NOT write "In conclusion" or "To summarize"
13. Do NOT use phrases like "In today's fast-paced tech world"
14. Be specific — avoid vague generalisations

KEY POINTS (separate JSON field):
- 3 to 5 short strings, each under 25 words, one verified fact each

QUICK BRIEF (separate JSON field — 3 bullets shown above article):
- Exactly 3 bullets, max 18 words each, starts with verb or number

FAQ (3 questions):
- Real questions readers would search on Google, answered from article facts only

SUGGESTED CATEGORY — pick exactly one:
tech-news | ai-automation | cybersecurity | gadgets | programming |
web-development | tutorials | digital-business | networking-it | reviews | desktops

Return ONLY valid JSON — no markdown, no code blocks, no explanation:
{
  "headline": "Compelling headline here",
  "content": "<p>Para 1</p><h3>Subheading</h3><p>Para 2</p><p>Para 3</p><h3>What This Means</h3><p>Para 4</p><h3>What's Next</h3><p>Para 5</p><h3>Key Points</h3><ul><li>Fact 1</li><li>Fact 2</li><li>Fact 3</li></ul><h3>The Bottom Line</h3><p>Para 6</p>",
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
  "blizineScore": 85,
  "isBreaking": false,
  "suggestedCategory": "tech-news"
}`
}

export async function manualWriteFromTopic(topic: string): Promise<BlizineArticle | null> {
  if (!topic || topic.length < 5) return null
  console.log(`[Blizine Manual] Writing from topic: ${topic.slice(0, 60)}`)

  const prompt = buildBlizinePrompt(topic, "topic")
  const article = await geminiGrounded(prompt, 'manual')
  if (article) {
    console.log(`[✓ Gemini+Search] ${article.headline.slice(0, 55)}`)
    return article
  }

  console.error(`[✗ ALL FAILED] Topic: ${topic.slice(0, 50)}`)
  return null
}

export async function manualWriteFromUrl(url: string): Promise<BlizineArticle | null> {
  if (!url || !url.startsWith("http")) return null
  console.log(`[Blizine Manual] Writing from URL: ${url.slice(0, 80)}`)

  let sourceContent = ""
  let sourceName = new URL(url).hostname.replace("www.", "")
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Blizine/1.0; +https://blizine.com/bot)" },
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
    console.warn(`[Blizine Manual] Could not pre-fetch ${url}, relying on Gemini grounding`)
  }

  const input = sourceContent.length > 200 ? sourceContent : url
  const inputType = sourceContent.length > 200 ? "content" : "url"

  const prompt = buildBlizinePrompt(input, inputType, sourceName)
  const article = await geminiGrounded(prompt, 'manual')
  if (article) {
    console.log(`[✓ Gemini+Search] ${article.headline.slice(0, 55)}`)
    return article
  }

  console.error(`[✗ ALL FAILED] URL: ${url.slice(0, 60)}`)
  return null
}

export async function geminiRewriteContent(title: string, content: string): Promise<string> {
  const textContent = stripHtml(content)
  if (!textContent || textContent.length < 50) return content

  const rewritePrompt =
    "You are a senior tech journalist writing for Blizine (blizine.com), a premium technology news blog.\n\n" +
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
    "- Do NOT mention Blizine in the article body\n" +
    "- Do NOT use phrases like 'In conclusion', 'To summarize', or 'In today's fast-paced world'\n\n" +
    "Article title: " + title + "\n\nOriginal content:\n" + textContent

  if (process.env.GEMINI_API_KEY) {
    try {
      const res = await genai.models.generateContent({
        model:    "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: rewritePrompt }] }],
        config:   { temperature: 0.5, maxOutputTokens: 4096 },
      })
      const text = res.candidates?.[0]?.content?.parts?.[0]?.text || ""
      if (text.length > 300) {
        console.log(`[✓ Gemini Rewrite] ${title.slice(0, 40)}`)
        return text
      }
    } catch (e) {
      console.warn("[Blizine] Gemini rewrite failed:", e)
    }
  }

  console.warn(`[✗ Rewrite ALL FAILED] ${title.slice(0, 40)} — returning original`)
  return content
}
