import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { paystackVerify } from "@/lib/paystack"
import { cjCreateOrder } from "@/lib/cj"

export const dynamic = "force-dynamic"

interface OrderLine {
  id: string
  name: string
  qty: number
  cj_pid?: string | null
  cj_vid?: string | null
}

// POST /api/marketplace/verify — confirm Paystack payment, then auto-place
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
      return NextResponse.json({ paid: true, status: order.status, cj_order_id: order.cj_order_id })
    }

    const tx = await paystackVerify(reference)
    if (tx.status !== "success") {
      await supabase.from("marketplace_orders").update({ paystack_status: tx.status || "failed" }).eq("id", order.id)
      return NextResponse.json({ paid: false, status: tx.status })
    }

    await supabase.from("marketplace_orders").update({ paystack_status: "paid", status: "paid" }).eq("id", order.id)

    // Auto-fulfill via CJ when we have variant ids for every line
    const lines = (order.items || []) as OrderLine[]
    const fulfillable = lines.length > 0 && lines.every((l) => l.cj_vid)
    if (fulfillable) {
      try {
        const result = (await cjCreateOrder({
          externalOrderNumber: String(order.id),
          shippingCountry: order.ship_country || "NG",
          shippingAddress: `${order.ship_address || ""} ${order.ship_city || ""}`.trim(),
          shippingCity: order.ship_city || "",
          shippingState: order.ship_state || "",
          shippingZip: order.ship_zip || "",
          shippingCustomerName: order.ship_name || "",
          shippingPhone: order.ship_phone || "",
          logisticName: "CJPacket",
          products: lines.map((l) => ({ vid: l.cj_vid as string, quantity: l.qty })),
        })) as { orderId?: string; id?: string } | null
        const cjId = result?.orderId || result?.id || null
        await supabase
          .from("marketplace_orders")
          .update({ cj_order_id: cjId, cj_status: cjId ? "submitted" : "manual_needed", status: cjId ? "fulfilled" : "paid" })
          .eq("id", order.id)
        return NextResponse.json({ paid: true, status: cjId ? "fulfilled" : "paid", cj_order_id: cjId })
      } catch {
        await supabase.from("marketplace_orders").update({ cj_status: "manual_needed" }).eq("id", order.id)
        return NextResponse.json({ paid: true, status: "paid", fulfillment: "manual" })
      }
    }

    await supabase.from("marketplace_orders").update({ cj_status: "manual_needed" }).eq("id", order.id)
    return NextResponse.json({ paid: true, status: "paid", fulfillment: "manual" })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Verification failed."
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
