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