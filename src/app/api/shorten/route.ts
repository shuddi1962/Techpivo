import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const SHORTENERS: { name: string; url: (u: string) => string }[] = [
  {
    name: "tinyurl",
    url: (u) => `https://tinyurl.com/api-create.php?url=${encodeURIComponent(u)}`,
  },
  {
    name: "isgd",
    url: (u) => `https://is.gd/create.php?format=simple&url=${encodeURIComponent(u)}`,
  },
]

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url")
  if (!target) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }
  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 })
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Only http(s) URLs are allowed" }, { status: 400 })
  }

  for (const svc of SHORTENERS) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 6000)
      const res = await fetch(svc.url(target), {
        signal: ctrl.signal,
        headers: { "User-Agent": "Mozilla/5.0 (TechPivo Shortener)" },
      })
      clearTimeout(timer)
      if (!res.ok) continue
      const txt = (await res.text()).trim()
      if (txt.startsWith("http://") || txt.startsWith("https://")) {
        return NextResponse.json({ shortUrl: txt, service: svc.name })
      }
    } catch {
      // try next provider
    }
  }

  return NextResponse.json({ shortUrl: target, service: null, fallback: true })
}
