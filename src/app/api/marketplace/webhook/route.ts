import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { resolveKorapaySecret, verifyKorapaySignature } from "@/lib/korapay"
import { fulfillMarketplaceOrder } from "@/lib/marketplace-fulfill"

export const dynamic = "force-dynamic"

// POST /api/marketplace/webhook — Korapay server webhook.
// Verifies x-korapay-signature (HMAC-SHA256 of the `data` object), marks the
// matching order paid, and triggers CJ auto-fulfillment. Always 200s (after
// signature check) so Korapay stops retrying.
export async function POST(request: NextRequest) {
  try {
    const raw = await request.text().catch(() => "")
    const body = (raw ? JSON.parse(raw) : null) as {
      event?: string
      data?: { reference?: string; payment_reference?: string; status?: string }
    } | null
    if (!body?.data) return NextResponse.json({ received: false }, { status: 200 })

    const secret = await resolveKorapaySecret()
    const signature = request.headers.get("x-korapay-signature")
    if (!secret || !verifyKorapaySignature(body.data, signature, secret)) {
      return NextResponse.json({ received: false }, { status: 200 })
    }

    if (body.event !== "charge.success" && body.data.status !== "success") {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const refs = [body.data.payment_reference, body.data.reference].map((r) => String(r || "").trim()).filter(Boolean)
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
    await fulfillMarketplaceOrder(supabase, {
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
    return NextResponse.json({ received: true }, { status: 200 })
  } catch {
    return NextResponse.json({ received: false }, { status: 200 })
  }
}
