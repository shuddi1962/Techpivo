import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { korapayVerify } from "@/lib/korapay"
import { fulfillMarketplaceOrder } from "@/lib/marketplace-fulfill"
import { notifyMarketplacePaid } from "@/lib/marketplace-email"

export const dynamic = "force-dynamic"

// POST /api/marketplace/verify — confirm Korapay payment, then auto-place
// the CJDropshipping fulfillment order when every line has a variant id.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const reference = String(body?.reference || "").trim()
    if (!reference) return NextResponse.json({ error: "Payment reference required." }, { status: 400 })

    const supabase = createClient()
    const { data: order } = await supabase.from("marketplace_orders").select("*").eq("paystack_reference", reference).maybeSingle()
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 })
    if (order.paystack_status === "paid") {
      // Already confirmed (e.g. via webhook) — still attempt fulfillment if
      // it hasn't happened yet instead of returning early without CJ.
      if (!order.cj_order_id && order.status === "paid") {
        const result = await fulfillMarketplaceOrder(supabase, order)
        return NextResponse.json({ paid: true, status: result.cj_order_id ? "fulfilled" : "paid", cj_order_id: result.cj_order_id })
      }
      return NextResponse.json({ paid: true, status: order.status, cj_order_id: order.cj_order_id })
    }

    const tx = await korapayVerify(reference)
    if (tx.status !== "success") {
      await supabase.from("marketplace_orders").update({ paystack_status: tx.status || "failed" }).eq("id", order.id)
      return NextResponse.json({ paid: false, status: tx.status })
    }

    await supabase.from("marketplace_orders").update({ paystack_status: "paid", status: "paid" }).eq("id", order.id)

    const result = await fulfillMarketplaceOrder(supabase, { ...order, paystack_status: "paid", status: "paid" })
    // Order emails (buyer confirmation + admin alert) — fire-and-forget.
    {
      const o = order as {
        id: string; email: string; items?: { name?: string; qty?: number; unit_usd?: number }[];
        subtotal_usd?: number | null; shipping_usd?: number | null; total_usd?: number | null; total_ngn?: number | null;
        paystack_reference?: string | null; ship_name?: string | null; ship_phone?: string | null; ship_address?: string | null;
        ship_city?: string | null; ship_state?: string | null; ship_zip?: string | null; ship_country?: string | null;
        ship_method?: string | null; ship_eta?: string | null;
      }
      void notifyMarketplacePaid({ ...o, cj_order_id: result.cj_order_id }).catch(() => {})
    }
    if (result.cj_order_id) {
      return NextResponse.json({ paid: true, status: "fulfilled", cj_order_id: result.cj_order_id })
    }
    return NextResponse.json({ paid: true, status: "paid", fulfillment: "manual" })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Verification failed."
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
