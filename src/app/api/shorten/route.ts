import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// In-memory cache: shortUrl cache for the same longUrl, dedupes + reduces provider load.
const cache = new Map<string, { url: string; service: string | null; ts: number }>()
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24h
const CACHE_MAX = 2000

function getCached(target: string) {
  const hit = cache.get(target)
  if (!hit) return null
  if (Date.now() - hit.ts > CACHE_TTL_MS) { cache.delete(target); return null }
  return hit
}
function setCached(target: string, url: string, service: string | null) {
  if (cache.size >= CACHE_MAX) {
    // Drop oldest 10% to make room
    const drop = Math.floor(CACHE_MAX * 0.1)
    const it = cache.keys()
    for (let i = 0; i < drop; i++) { const k = it.next().value; if (k !== undefined) cache.delete(k) }
  }
  cache.set(target, { url, service, ts: Date.now() })
}

const SHORTENERS: { name: string; url: (u: string) => string; parse: (t: string) => string | null }[] = [
  {
    name: "tinyurl",
    url: (u) => `https://tinyurl.com/api-create.php?url=${encodeURIComponent(u)}`,
    parse: (t) => (t.startsWith("http://") || t.startsWith("https://")) ? t.trim() : null,
  },
  {
    name: "isgd",
    url: (u) => `https://is.gd/create.php?format=simple&url=${encodeURIComponent(u)}`,
    parse: (t) => (t.startsWith("http://") || t.startsWith("https://")) ? t.trim() : null,
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

  // Cache hit → return instantly
  const hit = getCached(target)
  if (hit) {
    return NextResponse.json(
      { shortUrl: hit.url, service: hit.service, cached: true },
      { headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } }
    )
  }

  // Try providers in order; the first one that returns a valid URL wins
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
      const short = svc.parse(txt)
      if (short && short !== target) {
        setCached(target, short, svc.name)
        return NextResponse.json(
          { shortUrl: short, service: svc.name },
          { headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } }
        )
      }
    } catch {
      // try next provider
    }
  }

  // Fallback: return the long URL (client still works, just no shortener)
  setCached(target, target, null)
  return NextResponse.json(
    { shortUrl: target, service: null, fallback: true },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } }
  )
}
