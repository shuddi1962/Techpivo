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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")

  if (!query) {
    return NextResponse.json({ items: [], source: "none" })
  }

  // Google Custom Search first (requires GOOGLE_API_KEY + GOOGLE_CX), then
  // fall back to the keyless Wikimedia Commons API (licensed, realtime).
  const googleItems = await searchGoogle(query)
  if (googleItems.length > 0) {
    return NextResponse.json({ items: googleItems, source: "google" })
  }

  const wikimediaItems = await searchWikimedia(query)
  return NextResponse.json({ items: wikimediaItems, source: wikimediaItems.length > 0 ? "wikimedia" : "none" })
}
