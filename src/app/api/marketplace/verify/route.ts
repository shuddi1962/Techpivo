import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { flutterwaveVerify } from "@/lib/flutterwave"
import { fulfillMarketplaceOrder } from "@/lib/marketplace-fulfill"
import { notifyMarketplacePaid } from "@/lib/marketplace-email"

export const dynamic = "force-dynamic"

// POST /api/marketplace/verify — confirm gateway payment, then auto-place
// the CJDropshipping fulfillment order when every line has a variant id.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const reference = String(body?.reference || body?.tx_ref || "").trim()
    // Gateway redirect appends these; the transaction id is what the
    // verify API needs, the tx_ref must match our stored order reference.
    const transactionId = String(body?.transaction_id || body?.transactionId || "").trim()
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

    if (!transactionId) {
      // No gateway transaction to check (e.g. buyer closed the payment
      // page). The order stays pending — Track Order picks it up once paid.
      return NextResponse.json({ paid: false, status: "pending" })
    }

    const tx = await flutterwaveVerify(transactionId)
    if (tx.tx_ref !== reference) {
      return NextResponse.json({ error: "Payment reference mismatch." }, { status: 400 })
    }
    if (tx.status !== "successful") {
      await supabase.from("marketplace_orders").update({ paystack_status: tx.status || "failed" }).eq("id", order.id)
      return NextResponse.json({ paid: false, status: tx.status })
    }
    // Amount sanity: paid naira must cover the order total (tolerate FX drift).
    const expected = Number(order.total_ngn) || 0
    if (expected > 0 && tx.amount + 1 < expected) {
      await supabase.from("marketplace_orders").update({ paystack_status: "amount_mismatch" }).eq("id", order.id)
      return NextResponse.json({ paid: false, status: "amount_mismatch" })
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
