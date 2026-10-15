import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { cjGetOrderDetail } from "@/lib/cj"

export const dynamic = "force-dynamic"

// GET /api/marketplace/orders/track?reference=TPM-...&email=you@x.com
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const reference = (url.searchParams.get("reference") || "").trim()
  const email = (url.searchParams.get("email") || "").trim().toLowerCase()
  if (!reference || !email) {
    return NextResponse.json({ error: "Order reference and email are required." }, { status: 400 })
  }
  const supabase = createClient()
  const { data: order } = await supabase
    .from("marketplace_orders")
    .select("paystack_reference,status,paystack_status,cj_order_id,cj_status,total_ngn,total_usd,subtotal_usd,shipping_usd,items,created_at,ship_city,ship_country")
    .eq("paystack_reference", reference)
    .eq("email", email)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: "No order matches that reference and email." }, { status: 404 })

  // Coupon itemization (graceful until migration 096 is applied live).
  let coupon: { coupon_code: string | null; discount_usd: number } = { coupon_code: null, discount_usd: 0 }
  try {
    const { data: extra } = await supabase
      .from("marketplace_orders")
      .select("coupon_code,discount_usd")
      .eq("paystack_reference", reference)
      .eq("email", email)
      .maybeSingle()
    const row = extra as { coupon_code?: string | null; discount_usd?: number | null } | null
    if (row && (row.coupon_code || Number(row.discount_usd) > 0)) {
      coupon = { coupon_code: row.coupon_code || null, discount_usd: Number(row.discount_usd) || 0 }
    }
  } catch {
    // columns not migrated yet — totals still reflect the discount
  }

  let cj: unknown = null
  if (order.cj_order_id) {
    try {
      cj = await cjGetOrderDetail(order.cj_order_id)
    } catch {
      cj = null
    }
  }
  return NextResponse.json({ order, coupon, tracking: cj })
}
