import { NextResponse } from "next/server"

export interface StockImageItem {
  src: string
  alt: string
  link: string
  license: string
}

async function searchGoogle(query: string): Promise<StockImageItem[]> {
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

async function searchWikimedia(query: string): Promise<StockImageItem[]> {
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

async function searchBing(query: string): Promise<StockImageItem[]> {
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")
  const engine = searchParams.get("engine") || "auto"

  if (!query) {
    return NextResponse.json({ items: [], source: "none" })
  }

  // engine=auto tries Google Custom Search (needs keys), then keyless Bing
  // live web scrape, then the keyless Wikimedia Commons API as a last resort.
  if (engine === "google" || engine === "auto") {
    const googleItems = await searchGoogle(query)
    if (googleItems.length > 0) {
      return NextResponse.json({ items: googleItems, source: "google" })
    }
  }

  if (engine === "bing" || engine === "auto") {
    const bingItems = await searchBing(query)
    if (bingItems.length > 0) {
      return NextResponse.json({ items: bingItems, source: "bing" })
    }
  }

  if (engine === "wikimedia" || engine === "auto") {
    const wikimediaItems = await searchWikimedia(query)
    if (wikimediaItems.length > 0) {
      return NextResponse.json({ items: wikimediaItems, source: "wikimedia" })
    }
  }

  return NextResponse.json({ items: [], source: "none" })
}
