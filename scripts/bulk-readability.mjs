// Standalone bulk readability pass — uses Supabase REST API + dotenv.
// Port of the real editor's improveReadability + splitLongParagraphs algorithms.
// Run: node scripts/bulk-readability.mjs

import { config } from "dotenv"
config({ path: ".env.local" })

const BASE = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "")
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
if (!BASE || !KEY) { console.error("Missing env vars"); process.exit(1) }

const MIN_FLESCH = 30
const MAX_POSTS = 50

const hdrs = { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" }

async function get(path) {
  const r = await fetch(`${BASE}/rest/v1/${path}`, { headers: hdrs })
  return { ok: r.ok, status: r.status, data: await r.json() }
}

async function patch(table, id, body) {
  const r = await fetch(`${BASE}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH", headers: { ...hdrs, Prefer: "return=minimal" },
    body: JSON.stringify(body)
  })
  return { ok: r.ok, status: r.status }
}

// ─── Readability (mirrors seo-utils.ts) ───────────────────────────────────────
function stripHtml(html) {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ").trim()
}

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, "")
  if (word.length <= 3) return 1
  let s = 0, prev = false
  for (const ch of word) {
    const v = "aeiouy".includes(ch)
    if (v && !prev) s++
    prev = v
  }
  if (word.endsWith("e") && s > 1) s--
  return Math.max(1, s)
}

function calculateReadability(content) {
  const plain = stripHtml(content)
  const words = plain.split(/\s+/).filter(Boolean)
  const sentences = plain.split(/[.!?]+/).filter(Boolean)
  const wc = words.length, sc = Math.max(sentences.length, 1)
  const syl = words.reduce((a, w) => a + countSyllables(w), 0)
  const flesch = Math.max(0, Math.min(100, 206.835 - 1.015 * (wc / sc) - 84.6 * (syl / wc)))
  let score = flesch >= 90 ? 100 : flesch >= 80 ? 90 : flesch >= 70 ? 75 : flesch >= 60 ? 60 : flesch >= 50 ? 45 : flesch >= 30 ? 25 : 10
  return { score, flesch: Math.round(flesch * 10) / 10 }
}

// ─── Ellipsis normalization (fixes AI-generated content using "..." as sentence joins) ───
function normalizeEllipses(html) {
  return html.replace(/\.\.\.(\s+)/g, ". $1")
}

// ─── Sentence split (mirrors editor-autofix.ts) ──────────────────────────────
const CLAUSE_BOUNDARIES = [
  " — ", " – ", "; ", ", and ", " but ", " because ", " so ", " which ", " that ",
  " while ", " although ", " since ", " when ", " where ", " however, ",
  " meanwhile, ", " in addition, ", " for example, ", " such as ", " including ",
]

function splitSentenceIntoTwo(sentence, maxWords) {
  const tokens = sentence.split(/\s+/).filter(Boolean)
  if (tokens.length <= maxWords) return [sentence]

  const lo = Math.max(6, Math.floor(maxWords * 0.5))
  const hi = Math.max(10, Math.floor(maxWords * 0.92))
  const fallbackMin = Math.max(6, Math.floor(maxWords * 0.35))

  let bestEnd = -1, fallbackEnd = -1
  for (const b of CLAUSE_BOUNDARIES) {
    let idx = sentence.toLowerCase().indexOf(b)
    while (idx !== -1) {
      const firstWords = sentence.slice(0, idx).trim().split(/\s+/).filter(Boolean).length
      if (firstWords >= lo && firstWords <= hi) bestEnd = idx
      else if (fallbackEnd === -1 && firstWords >= fallbackMin) fallbackEnd = idx
      idx = sentence.toLowerCase().indexOf(b, idx + 1)
    }
  }
  if (bestEnd === -1 && fallbackEnd !== -1) bestEnd = fallbackEnd

  if (bestEnd === -1) {
    const target = Math.max(fallbackMin, Math.floor(maxWords * 0.85))
    let charEnd = 0
    for (let i = 0; i < target && i < tokens.length; i++) {
      if (i > 0) charEnd += 1
      charEnd += tokens[i].length
    }
    if (charEnd < sentence.length - 1) {
      const first = sentence.slice(0, charEnd).replace(/[\s,;]+$/, "")
      let second = sentence.slice(charEnd).replace(/^\s+/, "")
      second = second.charAt(0).toUpperCase() + second.slice(1)
      if (first && second) return [first + ".", second]
    }
    return [sentence]
  }

  const first = sentence.slice(0, bestEnd).replace(/[\s,;]+$/, "")
  let second = sentence.slice(bestEnd).replace(/^\s*[,;]?\s+/, "").replace(/^—\s+/, "")
  second = second.charAt(0).toUpperCase() + second.slice(1)
  if (!second) return [sentence]
  return [first + ".", second]
}

const SENTENCE_RE = /[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g

function splitSentence(sentence, depth, maxWords) {
  if (depth <= 0) return [sentence]
  const words = sentence.split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return [sentence]
  if (sentence.includes("http") || sentence.includes("://")) return [sentence]
  const parts = splitSentenceIntoTwo(sentence, maxWords)
  if (parts.length === 1) return parts
  return [parts[0], ...splitSentence(parts[1], depth - 1, maxWords)]
}

function fixTextRun(run, maxWords) {
  let changed = false
  const rebuilt = run.replace(SENTENCE_RE, (sentence) => {
    const words = sentence.split(/\s+/).filter(Boolean)
    if (words.length <= maxWords) return sentence
    if (sentence.includes("http")) return sentence
    const parts = splitSentence(sentence, 3, maxWords)
    if (parts.length === 1) return sentence
    changed = true
    return parts.join(" ")
  })
  return { text: rebuilt, changed }
}

// Core: split HTML by tags, only touch plain-text runs
function splitLongSentences(html, maxWords = 24) {
  const segments = html.split(/(<[^>]*>)/)
  let changed = false
  const out = segments.map((seg) => {
    if (seg.startsWith("<") || seg.endsWith(">") || !seg.trim()) return seg
    if (/[\[\]*#`>_|]/.test(seg)) return seg
    const result = fixTextRun(seg, maxWords)
    if (result.changed) changed = true
    return result.text
  })
  return changed ? out.join("") : html
}

// ─── Paragraph split (mirrors editor-autofix.ts) ─────────────────────────────
function findParagraphSplitPoints(inner, maxWords, minChunk) {
  const points = []
  const re = /\.\s+/g
  let lastChunkWords = 0
  const totalWords = inner.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length
  let m
  while ((m = re.exec(inner)) !== null) {
    const i = m.index
    const lastOpen = inner.lastIndexOf("<", i)
    const lastClose = inner.lastIndexOf(">", i)
    if (lastClose < lastOpen) continue
    const before = inner.slice(Math.max(0, i - 80), i)
    if (/https?:\/\/|www\./i.test(before)) continue
    const chunkWords = inner.slice(0, i + 1).replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length
    const gap = chunkWords - lastChunkWords
    const remaining = totalWords - chunkWords
    if (gap < minChunk || remaining < minChunk) continue
    points.push(i)
    lastChunkWords = chunkWords
  }
  return points
}

function splitLongParagraphs(html, maxWords = 150) {
  const pRe = /<p[^>]*>[\s\S]*?<\/p>/gi
  let changed = false
  const out = html.replace(pRe, (whole) => {
    const openTag = /^<p[^>]*>/.exec(whole)?.[0]
    if (!openTag || !whole.endsWith("</p>")) return whole
    const inner = whole.slice(openTag.length, whole.length - "</p>".length)
    const words = inner.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length
    if (words <= maxWords) return whole
    const minChunk = Math.max(40, Math.floor(maxWords * 0.6))
    const pts = findParagraphSplitPoints(inner, maxWords, minChunk)
    if (pts.length === 0) return whole
    changed = true
    let rebuilt = inner
    for (const p of pts.slice().reverse()) {
      rebuilt = rebuilt.slice(0, p) + "</p><p>" + rebuilt.slice(p)
    }
    return openTag + rebuilt + "</p>"
  })
  return changed ? out : html
}

// Public API: apply full readability pipeline
function improveReadability(html) {
  const normalized = normalizeEllipses(html)
  const base = splitLongSentences(normalized, 24)
  if (calculateReadability(base).flesch >= MIN_FLESCH) return base
  const aggressive = splitLongSentences(base, 16)
  if (calculateReadability(aggressive).flesch > calculateReadability(base).flesch) return aggressive
  return base
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Fetching posts with Flesch < ${MIN_FLESCH}…`)
  const { ok, status, data: posts } = await get(
    `posts?select=id,title,slug,content,flesch_score,readability_score&status=eq.published&flesch_score=lt.${MIN_FLESCH}&order=flesch_score.asc&limit=${MAX_POSTS}`
  )
  if (!ok) { console.error(`Fetch failed HTTP ${status}:`, JSON.stringify(posts)); process.exit(1) }
  if (!posts?.length) { console.log("No posts below Flesch 30."); return }

  console.log(`Found ${posts.length} posts.\n`)

  const results = []
  for (const post of posts) {
    if (!post.content) { results.push({ ...post, before: { flesch: 0, score: 0 }, after: { flesch: 0, score: 0 }, changed: false }); continue }

    const before = calculateReadability(post.content)
    const step1 = improveReadability(post.content)
    const after1 = calculateReadability(step1)
    const final = splitLongParagraphs(step1)
    const after = calculateReadability(final)
    const changed = final !== post.content

    results.push({ id: post.id, slug: post.slug, title: post.title, before, after, changed })

    const arrow = after.flesch >= MIN_FLESCH ? "✓" : "✗"
    const delta = final.length - post.content.length
    console.log(
      `${arrow}  ${post.title.slice(0, 58).padEnd(58)} ` +
      `F${String(before.flesch).padStart(5)}→${String(after.flesch).padStart(5)}  ` +
      `S${before.score}→${after.score}  ${delta >= 0 ? "+" : ""}${delta}B${changed ? "" : " (no chg)"}`
    )

    if (changed) {
      const plain = (final || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
      const wordCount = plain ? plain.split(/\s+/).filter(Boolean).length : null
      const { ok: sv } = await patch("posts", post.id, {
        content: final, flesch_score: after.flesch, readability_score: after.score,
        word_count: wordCount ?? post.word_count,
      })
      if (!sv) console.log(`  SAVE FAILED for ${post.id}`)
    }
  }

  const improved = results.filter(r => r.after.flesch >= MIN_FLESCH).length
  console.log(`\n${"=".repeat(68)}`)
  console.log(`Processed: ${results.length}  Improved to ${MIN_FLESCH}+: ${improved}  Still below: ${results.length - improved}`)
  if (results.length - improved > 0) {
    console.log(`\nSentence-split alone can't fix ${results.length - improved} posts — content needs rewriting.`)
    console.log(`The /api/admin/readability route handles AI rewriting after deployment.`)
  }
}

main().catch(err => { console.error("Fatal:", err); process.exit(1) })
