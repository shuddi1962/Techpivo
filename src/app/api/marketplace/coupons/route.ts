import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseMarketCoupons, validateCoupon } from "@/lib/marketplace-coupons"

export const dynamic = "force-dynamic"

// POST /api/marketplace/coupons — validate a code against a subtotal.
// { code, subtotal } → { ok, discount_usd, message }. Checkout re-validates
// server-side before charging, so this preview can never grant a discount.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const code = String(body?.code || "")
    const subtotal = Math.max(0, Number(body?.subtotal) || 0)
    const supabase = await createClient()
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "marketplace_coupons")
      .maybeSingle()
    const check = validateCoupon(parseMarketCoupons((data as { value?: unknown } | null)?.value), code, subtotal)
    if (!check.ok) return NextResponse.json({ ok: false, discount_usd: 0, message: check.reason })
    return NextResponse.json({ ok: true, discount_usd: check.discountUsd, code: check.coupon!.code, message: "Coupon applied." })
  } catch {
    return NextResponse.json({ ok: false, discount_usd: 0, message: "Could not check that code." }, { status: 500 })
  }
}
