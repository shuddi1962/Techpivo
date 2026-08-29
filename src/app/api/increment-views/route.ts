import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { createHash } from "crypto"

export const dynamic = "force-dynamic"

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) {
    const first = fwd.split(",")[0]?.trim()
    if (first && !first.includes(":")) return first
  }
  const real = req.headers.get("x-real-ip")
  if (real && !real.includes(":")) return real
  return ""
}

async function getCountryFromIp(ip: string): Promise<string | null> {
  if (!ip) return null
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 4000)
    try {
      const res = await fetch(
        `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode`,
        { signal: ctrl.signal }
      )
      if (!res.ok) return null
      const d = await res.json() as { status?: string; countryCode?: string }
      if (d?.status === "success" && d?.countryCode) return d.countryCode
      return null
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  try {
    const { postId, pageUrl, referrer, sessionId, device, browser, os } = await req.json()
    if (!postId && !pageUrl) {
      return NextResponse.json({ error: "postId or pageUrl required" }, { status: 400 })
    }

    const supabase = createClient()
    const ip = getClientIp(req)

    if (postId) {
      await supabase.rpc("increment_post_views", { post_id: postId })
    }

    const geoCountry = await getCountryFromIp(ip)
    const ipHash = ip
      ? createHash("sha256").update(ip).digest("hex").slice(0, 16)
      : null

    await supabase.from("analytics_events").insert({
      event_type: "page_view",
      post_id: postId || null,
      page_url: pageUrl || null,
      referrer: referrer || null,
      country: geoCountry,
      session_id: sessionId || null,
      device: device || null,
      browser: browser || null,
      os: os || null,
      user_agent: req.headers.get("user-agent") || null,
      ip_hash: ipHash,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("increment-views error:", error)
    return NextResponse.json({ error: "Failed to increment views" }, { status: 500 })
  }
}
