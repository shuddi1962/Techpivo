import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { resolveFlutterwaveWebhookHash, verifyFlutterwaveSignature } from "@/lib/flutterwave"
import { fulfillMarketplaceOrder } from "@/lib/marketplace-fulfill"
import { notifyMarketplacePaid } from "@/lib/marketplace-email"

export const dynamic = "force-dynamic"

// POST /api/marketplace/webhook — payment gateway server webhook.
// Verifies the `verif-hash` header against the secret hash, marks the
// matching order paid, and triggers CJ auto-fulfillment. Always 200s (after
// signature check) so the gateway stops retrying.
export async function POST(request: NextRequest) {
  try {
    const raw = await request.text().catch(() => "")
    const body = (raw ? JSON.parse(raw) : null) as {
      event?: string
      data?: { tx_ref?: string; txRef?: string; status?: string; id?: number }
    } | null
    if (!body?.data) return NextResponse.json({ received: false }, { status: 200 })

    const secretHash = await resolveFlutterwaveWebhookHash()
    const signature = request.headers.get("verif-hash")
    if (!secretHash || !verifyFlutterwaveSignature(signature, secretHash)) {
      return NextResponse.json({ received: false }, { status: 200 })
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
