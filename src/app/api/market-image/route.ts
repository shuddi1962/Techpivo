import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// TechPivo Market image proxy — supplier CDN hostnames must never appear
// on the storefront (img src, hover preview, view-source). Clients embed an
// opaque ?t= reference (base64url of the upstream URL); only explicit image
// hosts are allowed through, everything else 404s.
const ALLOW = [/\.cjdropshipping\.com$/i, /(^|\.)images\.pexels\.com$/i]

function decodeRef(t: string): string | null {
  try {
    const b64 = t.replace(/-/g, "+").replace(/_/g, "/")
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4)
    const raw = Buffer.from(padded, "base64").toString("utf-8")
    return decodeURIComponent(raw)
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const t = new URL(req.url).searchParams.get("t")
  if (!t) return new NextResponse("Missing image", { status: 404 })
  const upstreamUrl = decodeRef(t)
  if (!upstreamUrl) return new NextResponse("Bad image reference", { status: 404 })
  let url: URL
  try {
    url = new URL(upstreamUrl)
  } catch {
    return new NextResponse("Bad image URL", { status: 404 })
  }
  if (url.protocol !== "https:" || !ALLOW.some((re) => re.test(url.hostname))) {
    return new NextResponse("Host not allowed", { status: 404 })
  }
  try {
    const upstream = await fetch(url.toString(), {
      headers: { "User-Agent": "TechPivo-Market/1.0", Accept: "image/*" },
      signal: AbortSignal.timeout(15000),
    })
    if (!upstream.ok || !upstream.body) {
      return new NextResponse("Upstream error", { status: 404 })
    }
    const ct = upstream.headers.get("content-type") || "image/jpeg"
    if (!ct.startsWith("image/")) {
      return new NextResponse("Not an image", { status: 404 })
    }
    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    })
  } catch {
    return new NextResponse("Fetch failed", { status: 404 })
  }
}
