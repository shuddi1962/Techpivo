// Server-side live web image search — keyless by default.
// Chain: Google Custom Search (needs GOOGLE_API_KEY + GOOGLE_CX) → Bing live scrape → Wikimedia Commons.
// Pexels stays available ONLY as an explicit fallback (searchFeaturedImage) for server flows
// that must always find an image — the web is the general-purpose source site-wide.

export interface StockImageItem {
  src: string
  alt: string
  link: string
  license: string
}

export async function searchGoogle(query: string): Promise<StockImageItem[]> {
  const apiKey = process.env.GOOGLE_API_KEY
  const cx = process.env.GOOGLE_CX
  if (!apiKey || !cx) return []
  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&searchType=image&safe=active&num=9`
    const res = await fetch(url, { cache: "no-store" })
    const data = await res.json()
    return (data.items || []).map((p: any) => ({
      src: p.link,
      alt: p.title || query,
      link: p.image?.contextLink || p.link,
      license: "",
    }))
  } catch {
    return []
  }
}

export async function searchWikimedia(query: string): Promise<StockImageItem[]> {
  try {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: `filetype:bitmap ${query}`,
      gsrnamespace: "6",
      gsrlimit: "12",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "900",
      format: "json",
      origin: "*",
    })
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { cache: "no-store" })
    const data = await res.json()
    const pages = data.query?.pages as Record<string, any> | undefined
    if (!pages) return []
    return Object.values(pages).map((p) => {
      const info = p.imageinfo?.[0]
      if (!info) return null
      const meta = info.extmetadata || {}
      const license = String(meta.LicenseShortName?.value || meta.License?.value || "")
        .replace(/<[^>]*>/g, "")
        .trim()
      return {
        src: info.thumburl || info.url,
        alt: String(p.title || query).replace(/^File:/, ""),
        link: info.descriptionurl || info.url,
        license: license || "Free (Wikimedia Commons)",
      }
    }).filter((x): x is StockImageItem => x !== null)
  } catch {
    return []
  }
}

export async function searchBing(query: string): Promise<StockImageItem[]> {
  try {
    const res = await fetch(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&count=20`, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })
    const html = await res.text()
    const items: StockImageItem[] = []
    const seen = new Set<string>()
    const re = /m="([^"]*)"/g
    let match: RegExpExecArray | null
    while ((match = re.exec(html)) !== null && items.length < 20) {
      try {
        const unescaped = match[1]
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\\\//g, '/')
        const obj = JSON.parse(unescaped)
        const murl: string = obj.murl || ""
        if (!murl || !murl.startsWith("http") || seen.has(murl)) continue
        seen.add(murl)
        items.push({
          src: murl,
          alt: String(obj.t || query),
          link: String(obj.purl || obj.page || obj.murl || ""),
          license: "",
        })
      } catch { /* skip malformed result blocks */ }
    }
    return items
  } catch {
    return []
  }
}

export async function searchWebImages(
  query: string,
  engine: "auto" | "google" | "bing" | "wikimedia" = "auto"
): Promise<{ items: StockImageItem[]; source: "google" | "bing" | "wikimedia" | "none" }> {
  if (!query || !query.trim()) return { items: [], source: "none" }

  if (engine === "google" || engine === "auto") {
    const googleItems = await searchGoogle(query)
    if (googleItems.length > 0) return { items: googleItems, source: "google" }
  }
  if (engine === "bing" || engine === "auto") {
    const bingItems = await searchBing(query)
    if (bingItems.length > 0) return { items: bingItems, source: "bing" }
  }
  if (engine === "wikimedia" || engine === "auto") {
    const wikimediaItems = await searchWikimedia(query)
    if (wikimediaItems.length > 0) return { items: wikimediaItems, source: "wikimedia" }
  }
  return { items: [], source: "none" }
}

/** First usable web image URL for a query (or null). */
export async function searchWebImage(query: string): Promise<string | null> {
  const { items } = await searchWebImages(query, "auto")
  return items.find((i) => i.src.startsWith("http"))?.src || null
}

/** Web-first image with a Pexels fallback so server flows never end up imageless. */
export async function searchFeaturedImage(query: string): Promise<string | null> {
  const web = await searchWebImage(query)
  if (web) return web
  const key = process.env.PEXELS_API_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: key }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.photos?.[0]?.src?.large2x || null
  } catch {
    return null
  }
}

interface EnrichResult {
  content: string
  featuredImage: string | null
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function figureHtml(url: string, alt: string): string {
  return `<figure><img src="${escapeAttr(url)}" alt="${escapeAttr(alt.slice(0, 120))}" loading="lazy" /></figure>`
}

/**
 * Section headings that never produce a relevant image on their own
 * ("Introduction", "FAQ", "Related resources"…) — searching the live web for
 * those returns generic/irrelevant photos, so they are skipped.
 */
const GENERIC_HEADINGS = [
  "introduction", "intro", "overview", "key takeaways", "takeaways", "key points",
  "key developments", "the bottom line", "bottom line", "what this means",
  "what's next", "conclusion", "summary", "final thoughts", "wrap up",
  "faq", "frequently asked questions", "related resources", "related coverage",
  "more coverage", "see also", "references", "what you need to know",
]

function isGenericHeading(text: string, topic: string): boolean {
  const t = text.toLowerCase().trim()
  if (t.length < 3) return true
  if (topic.toLowerCase() && t === topic.toLowerCase()) return true
  return GENERIC_HEADINGS.some((g) => t === g || t.startsWith(`${g}:`) || t.startsWith(`${g} `))
}

/**
 * AI article enrichment: picks a web featured image AND inserts real, relevant
 * web images (charts, diagrams, screenshots, photos) into the article body —
 * one figure per matching H2 section — so AI-written articles are fully
 * illustrated from the live web. Pexels is only a fallback for the featured slot.
 */
export async function enrichArticleWithWebImages(
  content: string,
  topic: string,
  maxFigures = 2
): Promise<EnrichResult> {
  if (!content) return { content, featuredImage: null }

  const cleanTopic = topic.trim().replace(/\s+/g, " ").slice(0, 80)

  const featuredPromise = searchFeaturedImage(cleanTopic)

  const headings: { text: string; end: number }[] = []
  const h2Re = /<h2[^>]*>(.*?)<\/h2>/gi
  let m: RegExpExecArray | null
  while ((m = h2Re.exec(content)) !== null) {
    const text = m[1].replace(/<[^>]*>/g, "").trim()
    if (text) headings.push({ text: text.slice(0, 80), end: h2Re.lastIndex })
  }

  const figureQueries = headings
    .slice(0, 6)
    .map((h) => h.text)
    .filter((t) => !isGenericHeading(t, cleanTopic))
    .map((t) => `${cleanTopic} ${t}`.trim().slice(0, 100))
    .filter((q, i, arr) => arr.indexOf(q) === i)
    .slice(0, 4)

  const figurePromises = figureQueries.map(async (q) => ({
    query: q,
    src: await searchWebImage(q),
  }))

  const [featuredImage, figureResults] = await Promise.all([
    featuredPromise,
    Promise.all(figurePromises),
  ])

  let out = content
  let inserted = 0
  const usedSrcs = new Set<string>()
  const srcByQuery = new Map(figureResults.map((r) => [r.query, r.src]))
  for (let i = 0; i < headings.length && inserted < maxFigures; i++) {
    const query = `${cleanTopic} ${headings[i].text}`.trim().slice(0, 100)
    const src = srcByQuery.get(query)
    if (!src) continue
    usedSrcs.add(src)
    const figure = figureHtml(src, `${headings[i].text} — ${cleanTopic}`)
    const afterH2 = out.slice(headings[i].end)
    const pClose = afterH2.indexOf("</p>")
    const insertAt = pClose >= 0 ? headings[i].end + pClose + 4 : headings[i].end
    out = out.slice(0, insertAt) + "\n" + figure + "\n" + out.slice(insertAt)
    inserted++
  }

  // Paragraph fallback: articles with no usable H2 sections (or failed
  // heading-image searches) still get in-article figures — spread across the
  // first/middle/last paragraphs using the unused web results.
  if (inserted < maxFigures) {
    const spare = figureResults
      .map((r) => ({ src: r.src, alt: r.query.replace(`${cleanTopic} `, "") }))
      .filter((f): f is { src: string; alt: string } => {
        const s = f.src
        return s !== null && s !== undefined && s.length > 0 && !usedSrcs.has(s)
      })
      .slice(0, maxFigures - inserted)
    if (spare.length > 0) {
      const points: number[] = []
      const pRe = /<p[^>]*>[\s\S]*?<\/p>/gi
      let pm: RegExpExecArray | null
      while ((pm = pRe.exec(out)) !== null) points.push(pm.index + pm[0].length)
      const picks =
        points.length === 0
          ? []
          : points.length === 1
            ? [points[0]]
            : points.length === 2
              ? [points[0], points[1]]
              : [points[0], points[Math.floor(points.length / 2)], points[points.length - 1]]
      const limit = Math.min(spare.length, picks.length)
      for (let i = limit - 1; i >= 0; i--) {
        const at = picks[i]
        const figure = figureHtml(spare[i].src, `${spare[i].alt || cleanTopic} — ${cleanTopic}`)
        out = out.slice(0, at) + "\n" + figure + "\n" + out.slice(at)
      }
    }
  }

  return { content: out, featuredImage }
}