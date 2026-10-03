import { NextRequest, NextResponse } from "next/server"
import { createPublicClient } from "@/lib/supabase/server"
import { fetchWithTimeout } from "@/lib/fetch-timeout"
import { cjGetProduct, extractCjDetail } from "@/lib/cj"
import { marketImage, cleanSupplierText } from "@/lib/marketplace-images"

export const dynamic = "force-dynamic"

// GET /api/marketplace/detail?product_id=<uuid> — live supplier long
// description + extra gallery images. Sanitized; never exposes supplier
// internals. The product page shell stays fast + cacheable while this
// fills in client-side.
export async function GET(request: NextRequest) {
  const productId = new URL(request.url).searchParams.get("product_id") || ""
  if (!/^[0-9a-f-]{36}$/i.test(productId)) {
    return NextResponse.json({ error: "Invalid product." }, { status: 400 })
  }
  try {
    const supabase = createPublicClient()
    const res = (await fetchWithTimeout(
      supabase.from("affiliate_products").select("cj_pid").eq("id", productId).eq("is_active", true).maybeSingle(),
      8000
    )) as { data: { cj_pid: string | null } | null } | null
    const pid = res?.data?.cj_pid
    if (!pid) return NextResponse.json({ short: "", paras: [], images: [] })
    const raw = await cjGetProduct(pid)
    const d = extractCjDetail(raw)
    return NextResponse.json({
      short: cleanSupplierText(d.short),
      paras: d.paras.map((x) => cleanSupplierText(x)).filter(Boolean).slice(0, 20),
      images: d.images.map((x) => marketImage(x)).filter(Boolean),
    })
  } catch {
    return NextResponse.json({ short: "", paras: [], images: [] })
  }
}
