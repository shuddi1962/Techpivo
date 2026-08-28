// Brand-safety verification for web images.
//
// Every image that lands in an article (featured or in-body figure) must not
// carry another brand/company or news-outlet name/logo. Three layers:
//   1. Blocklist of news/aggregator/social hosts — their thumbnails and
//      screenshots routinely ship with the outlet's logo/watermark baked in.
//   2. Alt/URL/filename watermark signals ("logo", "watermark", "press release"…).
//   3. Best-effort vision check via OpenRouter on the actual pixels — NEVER
//      blocks the write pipeline (no key / HTTP error / timeout / oversized
//      image / unsupported model → treated as clean).

import type { StockImageItem } from '@/lib/web-images'
import { resolveOpenRouterKey, resolveOpenRouterModel } from '@/lib/openrouter-model'

// Layer 1 — hosts whose images/screenshots routinely carry outlet branding.
const NEWS_HOST_BLOCKLIST: string[] = [
  // Major English-language news & business outlets
  "bbc.com", "bbc.co.uk", "bbci.co.uk", "cnn.com", "reuters.com", "apnews.com",
  "ap.org", "afp.com", "bloomberg.com", "nytimes.com", "wsj.com", "theguardian.com",
  "ft.com", "telegraph.co.uk", "independent.co.uk", "mirror.co.uk",
  "dailymail.co.uk", "express.co.uk", "thesun.co.uk", "nypost.com",
  "washingtonpost.com", "latimes.com", "usatoday.com", "chicagotribune.com",
  "sfchronicle.com", "ajc.com", "npr.org", "politico.com", "axios.com",
  "time.com", "newsweek.com", "economist.com", "huffpost.com", "vox.com",
  "theatlantic.com", "newyorker.com", "foreignpolicy.com", "thehill.com",
  "businessinsider.com", "forbes.com", "cnbc.com", "abcnews.go.com",
  "nbcnews.com", "cbsnews.com", "msnbc.com", "foxnews.com", "yahoo.com",
  "insider.com", "quartz.com", "fastcompany.com", "fortune.com", "wired.com",
  // Tech press & blogs
  "theverge.com", "verge.com", "techcrunch.com", "engadget.com", "arstechnica.com",
  "zdnet.com", "cnet.com", "gizmodo.com", "kotaku.com", "mashable.com",
  "venturebeat.com", "thenextweb.com", "9to5mac.com", "macrumors.com",
  "androidauthority.com", "xda-developers.com", "phonearena.com", "gsmarena.com",
  "androidcentral.com", "windowscentral.com", "wccftech.com", "notebookcheck.net",
  "digitaltrends.com", "tomsguide.com", "pcmag.com", "pcworld.com",
  "extremetech.com", "howtogeek.com", "makeuseof.com", "lifehacker.com",
  "techradar.com", "tomshardware.com", "videocardz.com", "sammobile.com",
  "techpoint.africa", "techcrunchafrica.com", "benjamindada.com", "punchng.com",
  "thecable.ng", "techcabal.com", "techcrunch.com",
  // Social / platforms (screenshots there carry platform or channel branding)
  "youtube.com", "youtu.be", "instagram.com", "facebook.com", "x.com",
  "twitter.com", "linkedin.com", "tiktok.com", "reddit.com", "pinterest.com",
  "tumblr.com", "snapchat.com", "twitch.tv", "discord.com", "threads.net",
  // Search engines / aggregators
  "google.com", "googleusercontent.com", "bing.com", "msn.com", "yahoo.co.jp",
  "duckduckgo.com", "baidu.com", "wikipedia.org", "wikiquote.org",
  "wiktionary.org", "wikimediafoundation.org", "fandom.com",
  // Stock/aggregator hosts that can return unbranded-ish content but are safer skipped
  "gettyimages.com", "istockphoto.com", "shutterstock.com", "dreamstime.com",
  "adobe.com", "freepik.com", "123rf.com", "alamy.com", "istockphoto.com",
]

function hostOf(url: string): string {
  try {
    return (new URL(url).hostname || "").toLowerCase().replace(/^www\./, "")
  } catch {
    return ""
  }
}

function isBlockedHost(host: string): boolean {
  if (!host) return false
  const h = host.toLowerCase().replace(/^www\./, "")
  return NEWS_HOST_BLOCKLIST.some((d) => h === d || h.endsWith(`.${d}`))
}

// Layer 2 — alt text / URL / filename signals that scream "branding overlay".
const WATERMARK_RE =
  /(logo|water[-_ ]?mark|watermarked|emblem|crest|insignia|trademark|copyright|newsroom|press[-_ ]?release|pressrelease|promo[-_ ]?(image|shot|banner)?|branding|brand[-_ ]?(mark|overlay)?|banner[-_ ]?(ad|overlay)|overlay|stamp|badge[-_ ]?ad|watermark_)/i

const SAFE_VISION_HOSTS = ["wikimedia.org", "pexels.com", "unsplash.com", "picsum.photos"]

/** Layers 1+2: drop candidates that are hosted by / linked to a blocklisted
 *  outlet or whose metadata carries a watermark/branding signal. */
export function filterBrandUnsafe(items: StockImageItem[]): StockImageItem[] {
  return items.filter((i) => {
    if (!i || !i.src) return false
    if (isBlockedHost(hostOf(i.src)) || (i.link && isBlockedHost(hostOf(i.link)))) return false
    const haystack = `${i.alt || ""} ${i.src} ${i.link || ""}`.toLowerCase()
    if (WATERMARK_RE.test(haystack)) return false
    return true
  })
}

// Layer 3 — best-effort pixel-level check. Returns:
//   true  → definitely carries a watermark/logo/brand mark (REJECT)
//   false → confirmed clean
//   null  → could not verify (no key / HTTP error / timeout / oversized) → assume safe
const VISION_CACHE = new Map<string, { result: boolean | null; at: number }>()
const VISION_TTL_MS = 1000 * 60 * 60 * 24 // cache verdicts 24h per URL
const MAX_VISION_BYTES = 8 * 1024 * 1024
const VISION_BUDGET_DEFAULT = 2 // vision calls per searchWebImage call (quota guard)

export function isKnownSafeHost(url: string): boolean {
  const host = hostOf(url)
  return SAFE_VISION_HOSTS.some((d) => host === d || host.endsWith(`.${d}`))
}

export async function imageHasBrandMark(url: string): Promise<boolean | null> {
  const apiKey = await resolveOpenRouterKey()
  if (!apiKey) return null

  const cached = VISION_CACHE.get(url)
  if (cached && Date.now() - cached.at < VISION_TTL_MS) return cached.result

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) })
    if (!res.ok) {
      VISION_CACHE.set(url, { result: null, at: Date.now() })
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0 || buf.length > MAX_VISION_BYTES) {
      VISION_CACHE.set(url, { result: null, at: Date.now() })
      return null
    }
    const mime = (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim()
    const b64 = buf.toString("base64")

    const model = await resolveOpenRouterModel()
    const gres = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://techpivo.com",
        "X-Title": "TechPivo",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image. Does it contain a visible watermark, logo, or a brand, company, or news-outlet name or emblem overlaid on or baked into the image? Answer with exactly one word: YES or NO.",
              },
              {
                type: "image_url",
                image_url: { url: `data:${mime};base64,${b64}` },
              },
            ],
          },
        ],
        max_tokens: 4,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(20000),
    })
    if (!gres.ok) {
      VISION_CACHE.set(url, { result: null, at: Date.now() })
      return null
    }
    const data = await gres.json()
    const text = (data?.choices?.[0]?.message?.content || "").trim().toUpperCase()
    const result = text.startsWith("YES") ? true : text.startsWith("NO") ? false : null
    VISION_CACHE.set(url, { result, at: Date.now() })
    return result
  } catch {
    VISION_CACHE.set(url, { result: null, at: Date.now() })
    return null
  }
}

/** Pick the first brand-safe image from a candidate list. Applies the vision
 *  check only up to `budget` candidates per call (quota guard); sources on
 *  known-safe hosts (Wikimedia/Pexels) skip the vision check entirely. */
export async function pickBrandSafeImage(
  items: StockImageItem[],
  budget: number = VISION_BUDGET_DEFAULT
): Promise<string | null> {
  let checked = 0
  for (const item of items) {
    if (!item || !item.src || !item.src.startsWith("http")) continue
    if (isKnownSafeHost(item.src)) return item.src
    if (checked >= budget) return item.src // vision budget spent → accept remaining
    checked++
    const hasMark = await imageHasBrandMark(item.src)
    if (hasMark === true) continue // branded/watermarked → try next candidate
    return item.src // clean or unverifiable
  }
  return null
}