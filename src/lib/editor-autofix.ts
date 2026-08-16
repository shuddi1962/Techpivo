// Client-safe auto-fix helpers for the post editor.
// Pure string transforms — all state changes go through updatePost() so every
// panel and the checklist update in realtime.

import { slugify } from "@/lib/utils"

export interface RelatedPost {
  title: string
  slug: string
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Keep the keyword visible in a slug, keyword-first: `keyword-base`. */
export function keywordSlug(keyword: string, baseSlug: string, max = 120): string {
  const k = slugify(keyword || "")
  const base = slugify(baseSlug || "")
  if (!k) return base.slice(0, max)
  if (base.includes(k)) return base.slice(0, max)
  const combined = `${k}-${base}`
  return combined.length > max ? combined.slice(0, max).replace(/-+$/, "") : combined
}

/** SEO title that always contains the focus keyword, capped at 60 chars. */
export function keywordTitle(keyword: string, base: string, max = 60): string {
  if (!keyword) return (base || "").slice(0, max)
  if ((base || "").toLowerCase().includes(keyword.toLowerCase())) return (base || "").slice(0, max)
  const prefix = `${keyword} | `
  const room = max - prefix.length
  const tail = base ? `${base.slice(0, Math.max(0, room - 1))}…` : ""
  return (prefix + tail).slice(0, max)
}

function findFirstLongParagraph(html: string): { inner: string; index: number; closeTag: number } | null {
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi
  let m: RegExpExecArray | null
  while ((m = pRe.exec(html)) !== null) {
    const inner = m[1].replace(/<[^>]*>/g, "").trim()
    if (inner.length > 40) return { inner, index: m.index, closeTag: m.index + m[0].length - "</p>".length }
  }
  return null
}

/**
 * Insert one natural keyword mention into the first substantial paragraph
 * (or append a paragraph when the content has none). Keeps markdown safe.
 */
export function insertKeywordSentence(html: string, keyword: string): string {
  if (!keyword) return html
  const target = findFirstLongParagraph(html)
  if (target) {
    if (target.inner.toLowerCase().includes(keyword.toLowerCase())) return html
    const sentence = ` This guide covers ${keyword} in detail.`
    return html.slice(0, target.closeTag) + sentence + html.slice(target.closeTag)
  }
  if (html.toLowerCase().includes(keyword.toLowerCase())) return html
  return `${html}\n\nThis guide covers ${keyword} in detail.`
}

/** Prepend the focus keyword to the first H2 so a heading contains it. */
export function keywordFirstHeading(html: string, keyword: string): string {
  if (!keyword) return html
  const h2Re = /<h2[^>]*>([\s\S]*?)<\/h2>/i
  const m = h2Re.exec(html)
  if (!m) return html
  const inner = m[1].replace(/<[^>]*>/g, "").trim()
  if (!inner || inner.toLowerCase().includes(keyword.toLowerCase())) return html
  const newH2 = `<h2>${keyword}: ${inner}</h2>`
  return html.slice(0, m.index) + newH2 + html.slice(m.index + m[0].length)
}

function findPhraseOutsideTags(html: string, phrase: string): number {
  const lower = html.toLowerCase()
  const needle = phrase.toLowerCase()
  let idx = lower.indexOf(needle)
  while (idx !== -1) {
    const before = html.slice(0, idx)
    const lastOpen = before.lastIndexOf("<")
    const lastClose = before.lastIndexOf(">")
    if (lastClose >= lastOpen) {
      const opened = (before.match(/<a[\s>]/gi) || []).length
      const closed = (before.match(/<\/a>/gi) || []).length
      if (opened <= closed) return idx
    }
    idx = lower.indexOf(needle, idx + 1)
  }
  return -1
}

/**
 * Insert up to maxLinks internal links by wrapping the first occurrence of a
 * related post's title phrase; falls back to a natural "You can also read…"
 * sentence at the end of the first paragraph when the phrase never appears.
 */
export function addInternalLinks(html: string, posts: RelatedPost[], maxLinks = 2): { html: string; added: number } {
  let out = html
  let added = 0
  for (const p of posts) {
    if (added >= maxLinks) break
    const words = p.title.split(/\s+/).filter((w) => w.length > 2)
    if (words.length === 0) continue
    let phrase = words.slice(0, 3).join(" ")
    let idx = findPhraseOutsideTags(out, phrase)
    if (idx === -1 && words.length >= 4) {
      phrase = words.slice(0, 4).join(" ")
      idx = findPhraseOutsideTags(out, phrase)
    }
    const link = `<a href="/${p.slug}">${phrase}</a>`
    if (idx !== -1) {
      out = out.slice(0, idx) + link + out.slice(idx + phrase.length)
      added++
      continue
    }
    const target = findFirstLongParagraph(out)
    if (target) {
      const sentence = ` You can also read <a href="/${p.slug}">${p.title}</a>.`
      out = out.slice(0, target.closeTag) + sentence + out.slice(target.closeTag)
      added++
    }
  }
  return { html: out, added }
}

const CLAUSE_BOUNDARIES = [
  " — ", " – ", "; ", ", and ", " but ", " because ", " so ", " which ", " that ",
  " while ", " although ", " since ", " when ", " where ", " however, ",
  " meanwhile, ", " in addition, ", " for example, ", " such as ", " including ",
]

function splitSentenceIntoTwo(sentence: string): string[] {
  const words = sentence.split(/\s+/).filter(Boolean)
  if (words.length <= 24) return [sentence]
  let bestEnd = -1
  let fallbackEnd = -1
  for (const b of CLAUSE_BOUNDARIES) {
    let idx = sentence.toLowerCase().indexOf(b)
    while (idx !== -1) {
      const firstWords = sentence.slice(0, idx).trim().split(/\s+/).filter(Boolean).length
      if (firstWords >= 12 && firstWords <= 22) bestEnd = idx
      else if (fallbackEnd === -1 && firstWords >= 8) fallbackEnd = idx
      idx = sentence.toLowerCase().indexOf(b, idx + 1)
    }
  }
  // Very long sentences with only an early clause break: split at the first
  // usable boundary instead of giving up — both halves stay ≥ 8 words.
  if (bestEnd === -1 && fallbackEnd !== -1) bestEnd = fallbackEnd
  if (bestEnd === -1) return [sentence]
  // Cut BEFORE the clause boundary so the conjunction/starter ("and", "but",
  // "which"…) begins the second sentence: "X, and it changes" → "X. And it changes".
  const first = sentence.slice(0, bestEnd).replace(/[\s,;]+$/, "")
  let second = sentence.slice(bestEnd).replace(/^\s*[,;]?\s+/, "").replace(/^—\s+/, "")
  second = second.charAt(0).toUpperCase() + second.slice(1)
  if (!second) return [sentence]
  return [first + ".", second]
}

function splitSentence(sentence: string, depth: number): string[] {
  if (depth <= 0) return [sentence]
  const words = sentence.split(/\s+/).filter(Boolean)
  if (words.length <= 24) return [sentence]
  if (sentence.includes("http") || sentence.includes("://")) return [sentence]
  const parts = splitSentenceIntoTwo(sentence)
  if (parts.length === 1) return parts
  return [parts[0], ...splitSentence(parts[1], depth - 1)]
}

const SENTENCE_RE = /[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g

function fixTextRun(run: string): string {
  let changed = false
  const rebuilt = run.replace(SENTENCE_RE, (sentence) => {
    if (sentence.split(/\s+/).filter(Boolean).length <= 24) return sentence
    if (sentence.includes("http")) return sentence
    const parts = splitSentence(sentence, 3)
    if (parts.length === 1) return sentence
    changed = true
    return parts.join(" ")
  })
  return changed ? rebuilt : run
}

/**
 * Split sentences longer than maxWords (default 24) at natural clause
 * boundaries (", and", " because", " — "…). Only plain-text runs are touched:
 * HTML tags and markdown-ish runs (links, bold, headings, code) are skipped so
 * structure can never be corrupted. The result is pure text — paragraphs and
 * lists stay intact.
 */
export function splitLongSentences(html: string, maxWords = 24): string {
  const segments = html.split(/(<[^>]*>)/)
  let changed = false
  const out = segments.map((seg) => {
    if (seg.startsWith("<") || seg.endsWith(">") || !seg.trim()) return seg
    if (/[\[\]*#`>_|]/.test(seg)) return seg
    const fixed = fixTextRun(seg)
    if (fixed !== seg) changed = true
    return fixed
  })
  return changed ? out.join("") : html
}