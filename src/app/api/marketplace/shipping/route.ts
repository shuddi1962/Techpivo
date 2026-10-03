import { NextRequest, NextResponse } from "next/server"
import { createPublicClient } from "@/lib/supabase/server"
import { fetchWithTimeout } from "@/lib/fetch-timeout"
import { cjGetFreight, cjGetVariants } from "@/lib/cj"

export const dynamic = "force-dynamic"

// GET /api/marketplace/shipping?product_id=<uuid>&variant_vid=<vid>&qty=1&country=NG
// Live courier estimate for one item (CJ freight calculation when the
// product is linked and reachable). Falls back to { estimate: null } —
// the store's Standard/Express methods always remain available.
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const productId = params.get("product_id") || ""
  const country = (params.get("country") || "NG").toUpperCase().slice(0, 2)
  const qty = Math.max(1, Math.min(99, Math.floor(Number(params.get("qty")) || 1)))
  if (!/^[0-9a-f-]{36}$/i.test(productId)) {
    return NextResponse.json({ error: "Invalid product." }, { status: 400 })
  }
  try {
    const supabase = createPublicClient()
    const res = (await fetchWithTimeout(
      supabase.from("affiliate_products").select("cj_pid,cj_vid").eq("id", productId).eq("is_active", true).maybeSingle(),
      8000
    )) as { data: { cj_pid: string | null; cj_vid: string | null } | null } | null
    const pid = res?.data?.cj_pid
    if (!pid) return NextResponse.json({ estimate: null })
    let vid = params.get("variant_vid") || res?.data?.cj_vid || ""
    if (!vid) {
      try {
        const variants = await cjGetVariants(pid)
        vid = String(variants.find((v) => v.vid)?.vid || "")
      } catch {
        return NextResponse.json({ estimate: null })
      }
    }
    if (!vid) return NextResponse.json({ estimate: null })
    const options = await cjGetFreight({ endCountryCode: country, products: [{ vid, quantity: qty }] })
    const best = (options || [])
      .map((o) => ({
        name: String(o.logisticName || "Standard"),
        fee: Number(o.shippingFee),
        eta: String(o.deliveryTime || ""),
      }))
      .filter((o) => Number.isFinite(o.fee) && o.fee >= 0)
      .sort((a, b) => a.fee - b.fee)[0]
    if (!best) return NextResponse.json({ estimate: null })
    return NextResponse.json({ estimate: best })
  } catch {
    return NextResponse.json({ estimate: null })
  }
}
