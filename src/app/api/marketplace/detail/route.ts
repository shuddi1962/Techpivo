import { NextRequest, NextResponse } from "next/server"
import { createPublicClient } from "@/lib/supabase/server"
import { fetchWithTimeout } from "@/lib/fetch-timeout"
import { cjGetProduct, extractCjDetail } from "@/lib/cj"
import { marketImage, cleanSupplierText, polishSupplierParas } from "@/lib/marketplace-images"

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
      supabase
        .from("affiliate_products")
        .select("cj_pid,cj_data,product_description")
        .eq("id", productId)
        .eq("is_active", true)
        .maybeSingle(),
      8000
    )) as {
      data: { cj_pid: string | null; cj_data: Record<string, unknown> | null; product_description: string | null } | null
    } | null
    const row = res?.data
    const pid = row?.cj_pid
    if (!pid) return NextResponse.json({ short: "", paras: [], images: [] })

    // Our own copy of the supplier description (stored at import time) —
    // free and instant. Only products we have not imported yet fall back
    // to a live supplier call.
    const stored = ((row?.cj_data || {}) as { desc?: string }).desc
    let raw: unknown = null
    if (stored && String(stored).length > 40) {
      raw = { description: String(stored) }
    } else {
      raw = await cjGetProduct(pid)
    }
    const d = extractCjDetail(raw)
    const paras = polishSupplierParas(
      d.paras
        .map((x) => cleanSupplierText(x))
        .filter(Boolean)
    ).slice(0, 20)
    return NextResponse.json({
      short: cleanSupplierText(d.short) || cleanSupplierText(row?.product_description || "").slice(0, 220),
      paras,
      images: d.images.map((x) => marketImage(x)).filter(Boolean),
      video: /^https?:\/\//i.test(d.video) ? d.video : "",
      material: cleanSupplierText(d.material).slice(0, 120),
      weightGrams: d.weightGrams,
    })
  } catch {
    return NextResponse.json({ short: "", paras: [], images: [] })
  }
}
