"use client"

/**
 * TechPivo Market — product copy rewrite engine.
 *
 * CJ/affiliate imports ship with noisy, keyword-stuffed titles and
 * wall-of-text descriptions. This module cleans them into short, human
 * readable copy that renders nicely on cards and the product page.
 *
 * Everything runs client-side (no extra API calls / credits) so it is safe
 * to apply to every product on every load. The engine keeps the ORIGINAL
 * supplier copy alongside the rewritten copy so an admin can review or
 * restore it at any time (see `rewriteProduct` return shape).
 */

const BOILERPLATE = [
  "for most of the",
  "for harley suzuki yamaha",
  "for harley bikes / cruisers /",
  "choppers / custom bikes",
  "specification:",
  "material:",
  "model:",
  "voltage:",
  "applicable models:",
  "light source:",
  "adaptation model:",
  "matching relationship:",
  "applicable color:",
  "package content:",
  "ships from: china",
  "sku:",
  "no reviews yet",
]

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>+/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function collapseWs(s: string): string {
  return s.replace(/\s+/g, " ").trim()
}

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","for","nor","on","at","to","from","by","with",
  "in","of","as","is","it","this","that","be","are","was","were","been","has","have",
])

function titleCase(word: string): string {
  const lower = word.toLowerCase()
  const UPPER = new Set(["usb","led","hdmi","wifi","api","ui","ux","cpu","gps","lcd","oem","diy","pc","mac","ai"])
  if (UPPER.has(lower)) return lower.toUpperCase()
  if (STOP_WORDS.has(lower)) return lower
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

const TRAILING_JUNK = /[\|•\-–—]\s*[^|•\-–—]{0,80}$/

/** Remove repeated keywords (e.g. "Men's Men's Shirt Shirt"). */
function dedupeWords(t: string): string {
  const words = t.split(/\s+/)
  const out: string[] = []
  let prevLower = ""
  for (const w of words) {
    const l = w.toLowerCase()
    if (l === prevLower) continue
    out.push(w)
    prevLower = l
  }
  return out.join(" ")
}

/** Strip leading category echoes that add no value ("Men's Men's ..."). */
function stripLeadingEcho(t: string): string {
  return t.replace(/^(men['’]s|women['’]s|boys|girls|kids|unisex)\s+\1\b\s*/i, "$1 ")
}

/**
 * Clean a supplier product title into a short, professional card title.
 * Keeps model numbers / specs, drops keyword stuffing, avoids mid-word
 * truncation.
 */
export function cleanProductTitle(name: string | null | undefined): string {
  if (!name) return "Product"
  let t = stripHtml(String(name))
  t = collapseWs(t)
  t = stripLeadingEcho(t)
  // Drop everything after a trailing pipe/dash junk segment.
  t = t.replace(TRAILING_JUNK, "").trim()
  // Remove common CJ boilerplate tails.
  for (const b of BOILERPLATE) {
    const re = new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi")
    t = t.replace(re, " ")
  }
  t = collapseWs(t)
  t = dedupeWords(t)
  t = stripLeadingEcho(t)
  t = collapseWs(t)

  const words = t.split(" ")
  if (words.length === 0) return "Product"
  const cleaned = words.map((w, i) => (i === 0 || i === words.length - 1 ? titleCase(w) : titleCase(w)))
  let out = cleaned.join(" ")

  // Cap length without cutting a word in half: prefer a clean break.
  if (out.length > 64) {
    const cut = out.lastIndexOf(" ", 61)
    out = cut > 10 ? out.slice(0, cut) : out.slice(0, 61)
    out = out.trim()
    if (!out.endsWith(".") && !out.endsWith(")")) out += "..."
  }
  return out || "Product"
}

/**
 * Short description: one benefit-led sentence (max ~120 chars), easy to scan.
 */
export function shortProductDescription(text: string | null | undefined, maxLen = 120): string {
  if (!text) return ""
  let d = stripHtml(String(text))
  d = collapseWs(d)
  const sentences = d.split(/(?<=[.!?])\s+/).map((s) => collapseWs(s)).filter(Boolean)
  let out = ""
  for (const s of sentences) {
    const low = s.toLowerCase()
    if (BOILERPLATE.some((b) => low.includes(b))) continue
    if (s.length < 6) continue
    const cand = (out ? out + " " : "") + s
    if (cand.length > maxLen && out.length > 0) break
    out = cand
  }
  out = collapseWs(out)
  if (out.length > maxLen) {
    const cut = out.lastIndexOf(" ", maxLen - 4)
    out = cut > 10 ? out.slice(0, cut) : out.slice(0, maxLen - 4)
    out = out.trim() + "..."
  }
  return out
}

/**
 * Main description: split into short, well-spaced paragraphs. Turns short
 * feature lines into bullet-ready paragraphs, drops boilerplate, keeps at
 * most 4 readable paragraphs.
 */
export function rewriteProductDescription(text: string | null | undefined): string[] {
  if (!text) return []
  let d = stripHtml(String(text))
  d = collapseWs(d)
  const raw = d.split(/(?<=[.!?])\s+/).map((s) => collapseWs(s)).filter(Boolean)
  const paras: string[] = []
  let buf = ""
  for (const s of raw) {
    const low = s.toLowerCase()
    if (BOILERPLATE.some((b) => low.includes(b))) continue
    if (s.length < 6) continue
    if ((buf + " " + s).length > 200) {
      if (buf) paras.push(collapseWs(buf))
      buf = s
    } else {
      buf = buf ? buf + " " + s : s
    }
  }
  if (buf) paras.push(collapseWs(buf))
  if (paras.length === 0) {
    paras.push(collapseWs(d.slice(0, 200)))
  }
  return paras.slice(0, 4)
}

export interface RewrittenProduct {
  title: string
  short: string
  paras: string[]
  /** The untouched supplier original, kept so it can be reviewed / restored. */
  originalTitle: string
  originalDescription: string | null
}

export function rewriteProduct(
  name: string | null | undefined,
  description: string | null | undefined,
): RewrittenProduct {
  const originalTitle = name || ""
  const title = cleanProductTitle(name)
  const paras = rewriteProductDescription(description)
  const short = shortProductDescription(description, 120) || paras[0] || ""
  return { title, short, paras, originalTitle, originalDescription: description ?? null }
}

/** Apply the copy engine to a product-shaped object, returning a copy with
 *  rewritten title / short description / paragraphs while preserving the
 *  originals for review or restore. */
export function rewriteProductRecord<T extends { product_name?: string | null; product_description?: string | null }>(
  p: T,
): T & RewrittenProduct {
  const r = rewriteProduct(p.product_name ?? null, p.product_description ?? null)
  return {
    ...p,
    ...r,
  } as T & RewrittenProduct
}
