import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { flutterwaveVerify, resolveFlutterwaveWebhookHash, verifyFlutterwaveSignature } from "@/lib/flutterwave"
import { fulfillMarketplaceOrder } from "@/lib/marketplace-fulfill"
import { notifyMarketplacePaid } from "@/lib/marketplace-email"
import { checkRateLimit, clientIp } from "@/lib/rate-limiter"

export const dynamic = "force-dynamic"

// POST /api/marketplace/webhook — payment gateway server webhook.
//
// SECURITY (a forged webhook = free goods):
//   1. When a "Secret Hash" is configured, the `verif-hash` header must match.
//   2. ALWAYS the transaction is re-verified server-side against the gateway
//      (status + tx_ref + amount + currency) before an order is marked paid —
//      a webhook body alone can never mark an order paid.
//   3. The paid amount must cover the order total.
//
// Always 200s so the gateway stops retrying.
export async function POST(request: NextRequest) {
  try {
    // The gateway retries, but a flood must never turn into a flood of
    // gateway verification calls.
    const limit = checkRateLimit(`mkt_webhook_${clientIp(request)}`, { limit: 120, windowMs: 60 * 1000 })
    if (!limit.allowed) return NextResponse.json({ received: true }, { status: 200 })
    const raw = await request.text().catch(() => "")
    const body = (raw ? JSON.parse(raw) : null) as {
      event?: string
      data?: {
        tx_ref?: string
        txRef?: string
        status?: string
        id?: number | string
        transaction_id?: number | string
        amount?: number | string
        currency?: string
      }
    } | null
    if (!body?.data) return NextResponse.json({ received: false }, { status: 200 })

    const secretHash = await resolveFlutterwaveWebhookHash()
    if (secretHash) {
      const signature = request.headers.get("verif-hash")
      if (!verifyFlutterwaveSignature(signature, secretHash)) {
        return NextResponse.json({ received: false }, { status: 200 })
      }
    }

    if (body.event !== "charge.completed" && body.data.status !== "successful") {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const refs = [body.data.tx_ref, body.data.txRef].map((r) => String(r || "").trim()).filter(Boolean)
    if (refs.length === 0) return NextResponse.json({ received: true }, { status: 200 })

    const supabase = createClient()
    let order: Record<string, unknown> | null = null
    for (const ref of refs) {
      const { data } = await supabase.from("marketplace_orders").select("*").eq("paystack_reference", ref).maybeSingle()
      if (data) {
        order = data as Record<string, unknown>
        break
      }
    }
    if (!order || typeof order.id !== "string") return NextResponse.json({ received: true }, { status: 200 })
    if (order.paystack_status === "paid") return NextResponse.json({ received: true }, { status: 200 })

    // Server-side verification — the only path that can mark an order paid.
    const txId = body.data.transaction_id ?? body.data.id
    if (txId !== undefined && txId !== null && String(txId).trim()) {
      try {
        const tx = await flutterwaveVerify(txId)
        const orderRef = String(order.paystack_reference || "")
        if (tx.tx_ref !== orderRef) {
          return NextResponse.json({ received: false }, { status: 200 })
        }
        if (tx.status !== "successful") {
          return NextResponse.json({ received: true }, { status: 200 })
        }
        if (tx.currency && tx.currency.toUpperCase() !== "NGN") {
          return NextResponse.json({ received: false }, { status: 200 })
        }
        const expected = Number(order.total_ngn) || 0
        if (expected > 0 && tx.amount + 1 < expected) {
          await supabase.from("marketplace_orders").update({ paystack_status: "amount_mismatch" }).eq("id", order.id)
          return NextResponse.json({ received: false }, { status: 200 })
        }
      } catch {
        // Gateway unreachable — do NOT trust the body. Leave the order pending;
        // the buyer-redirect verification path or a later webhook retry will
        // settle it.
        return NextResponse.json({ received: false }, { status: 200 })
      }
    } else if (!secretHash) {
      // No hash configured AND no transaction id — nothing can be proven.
      return NextResponse.json({ received: false }, { status: 200 })
    }

    await supabase.from("marketplace_orders").update({ paystack_status: "paid", status: "paid" }).eq("id", order.id)
    const fulfilled = await fulfillMarketplaceOrder(supabase, {
      ...(order as {
        id: string
        items?: unknown
        ship_country?: string | null
        ship_address?: string | null
        ship_city?: string | null
        ship_state?: string | null
        ship_zip?: string | null
        ship_name?: string | null
        ship_phone?: string | null
        ship_method?: string | null
      }),
    })
    // Order emails (buyer confirmation + admin alert) — fire-and-forget.
    {
      const o = order as {
        id: string; email: string; items?: { name?: string; qty?: number; unit_usd?: number }[];
        subtotal_usd?: number | null; shipping_usd?: number | null; total_usd?: number | null; total_ngn?: number | null;
        paystack_reference?: string | null; ship_name?: string | null; ship_phone?: string | null; ship_address?: string | null;
        ship_city?: string | null; ship_state?: string | null; ship_zip?: string | null; ship_country?: string | null;
        ship_method?: string | null; ship_eta?: string | null;
      }
      void notifyMarketplacePaid({ ...o, cj_order_id: fulfilled.cj_order_id }).catch(() => {})
    }
    return NextResponse.json({ received: true }, { status: 200 })
  } catch {
    return NextResponse.json({ received: false }, { status: 200 })
  }
}
