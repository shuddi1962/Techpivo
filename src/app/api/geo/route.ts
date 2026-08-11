import { NextResponse } from "next/server"
import { GeoInfo } from "@/lib/geo"

export const dynamic = "force-dynamic"

const cache = new Map<string, { t: number; geo: GeoInfo }>()
const CACHE_TTL_MS = 10 * 60 * 1000
const MAX_ENTRIES = 200

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) {
    const first = fwd.split(",")[0]?.trim()
    if (first && !first.includes(":")) return first
  }
  const real = req.headers.get("x-real-ip")
  if (real && !real.includes(":")) return real
  return ""
}

async function fromIpApi(ip: string): Promise<GeoInfo | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 6000)
    try {
      const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,currency,isp,query`, { signal: ctrl.signal })
      if (!res.ok) return null
      const d = await res.json()
      if (d?.status !== "success" || !d.countryCode) return null
      return {
        ip: d.query || ip, country: d.country, countryCode: d.countryCode,
        region: d.region, regionName: d.regionName, city: d.city,
        lat: d.lat, lon: d.lon, timezone: d.timezone, currency: d.currency || "", isp: d.isp || "",
        source: "ip-api",
      }
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return null
  }
}

async function fromIpwhois(ip: string): Promise<GeoInfo | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 6000)
    try {
      const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: ctrl.signal })
      if (!res.ok) return null
      const d = await res.json()
      if (d?.success !== true || !d.country_code) return null
      return {
        ip: ip, country: d.country, countryCode: d.country_code,
        region: d.region_code || "", regionName: d.region || "", city: d.city || "",
        lat: d.latitude, lon: d.longitude, timezone: d.timezone?.id || "",
        currency: d.currency?.code || "", isp: d.connection?.isp || "",
        source: "ipwhois",
      }
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  const ip = clientIp(req)
  if (!ip) {
    return NextResponse.json(
      { ip: null, country: null, countryCode: null, region: null, regionName: null, city: null, lat: null, lon: null, timezone: null, currency: null, isp: null, source: "unknown" },
      { headers: { "Cache-Control": "public, max-age=600" } },
    )
  }

  const hit = cache.get(ip)
  if (hit && Date.now() - hit.t < CACHE_TTL_MS) {
    return NextResponse.json(hit.geo)
  }

  let geo = await fromIpApi(ip)
  if (!geo) geo = await fromIpwhois(ip)
  if (!geo) {
    return NextResponse.json(
      { ip, country: null, countryCode: null, region: null, regionName: null, city: null, lat: null, lon: null, timezone: null, currency: null, isp: null, source: "unknown" },
      { status: 502 },
    )
  }

  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  cache.set(ip, { t: Date.now(), geo })

  return NextResponse.json(geo, { headers: { "Cache-Control": "public, max-age=600" } })
}