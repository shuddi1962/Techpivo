"use client"

/**
 * TechPivo Market — product copy rewrite engine.
 *
 * CJ/affiliate imports ship with noisy, keyword-stuffed titles and
 * wall-of-text descriptions. This module cleans them into short, human
 * readable copy that renders nicely on cards, the product page and the
 * description tabs. Everything is deterministic and runs client-side so no
 * extra API calls or credits are needed.
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
  if (lower === "usb" || lower === "led" || lower === "hdmi" || lower === "wifi" || lower === "wifi" || lower === "api" || lower === "ui" || lower === "ux") return word.toUpperCase()
  if (STOP_WORDS.has(lower)) return lower
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

const TRAILING_JUNK = /[\|•\-–—]\s*[^|•\-–—]{0,60}$/

export function cleanProductTitle(name: string | null | undefined): string {
  if (!name) return "Product"
  let t = stripHtml(String(name))
  t = collapseWs(t)
  // Drop everything after a trailing pipe/dash junk segment.
  t = t.replace(TRAILING_JUNK, "").trim()
  // Remove common CJ boilerplate tails.
  for (const b of BOILERPLATE) {
    const re = new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi")
    t = t.replace(re, " ")
  }
  t = collapseWs(t)
  // Title-case each word but keep short words lowercase (except first/last).
  const words = t.split(" ")
  if (words.length === 0) return "Product"
  const cleaned = words.map((w, i) => {
    if (i === 0 || i === words.length - 1) return titleCase(w)
    return titleCase(w)
  })
  let out = cleaned.join(" ")
  // Cap at a sensible card length.
  if (out.length > 70) out = out.slice(0, 67).trim() + "..."
  return out || "Product"
}

export function shortProductDescription(text: string | null | undefined, maxLen = 140): string {
  if (!text) return ""
  let d = stripHtml(String(text))
  d = collapseWs(d)
  // Take the first meaningful sentence(s) up to maxLen.
  const sentences = d.split(/(?<=[.!?])\s+/)
  let out = ""
  for (const s of sentences) {
    const cand = (out ? out + " " : "") + s
    if (cand.length > maxLen && out.length > 0) break
    out = cand
  }
  out = collapseWs(out)
  if (out.length > maxLen) out = out.slice(0, maxLen - 1).trim() + "..."
  return out
}

export function rewriteProductDescription(text: string | null | undefined): string[] {
  if (!text) return []
  let d = stripHtml(String(text))
  d = collapseWs(d)
  // Split into sentences, drop boilerplate lines.
  const raw = d.split(/(?<=[.!?])\s+/).map((s) => collapseWs(s)).filter(Boolean)
  const paras: string[] = []
  let buf = ""
  for (const s of raw) {
    const low = s.toLowerCase()
    if (BOILERPLATE.some((b) => low.includes(b))) continue
    if (s.length < 6) continue
    if ((buf + " " + s).length > 220) {
      if (buf) paras.push(collapseWs(buf))
      buf = s
    } else {
      buf = buf ? buf + " " + s : s
    }
  }
  if (buf) paras.push(collapseWs(buf))
  if (paras.length === 0) {
    // fallback: first 220 chars
    paras.push(collapseWs(d.slice(0, 220)))
  }
  return paras.slice(0, 4)
}

export interface RewrittenProduct {
  title: string
  short: string
  paras: string[]
}

export function rewriteProduct(
  name: string | null | undefined,
  description: string | null | undefined,
): RewrittenProduct {
  const title = cleanProductTitle(name)
  const paras = rewriteProductDescription(description)
  const short = shortProductDescription(description, 140) || paras[0] || ""
  return { title, short, paras }
}
