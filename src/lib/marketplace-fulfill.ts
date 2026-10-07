// Shared CJ auto-fulfillment for marketplace orders (server-side only).
// Used by both the verify endpoint (redirect flow) and the Korapay webhook.

import type { SupabaseClient } from "@supabase/supabase-js"
import { cjCreateOrder } from "@/lib/cj"
import { supplierShipOptions } from "@/lib/marketplace-freight"

interface OrderLine {
  id: string
  name: string
  qty: number
  cj_pid?: string | null
  cj_vid?: string | null
}

interface FulfillOrder {
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
}

export async function fulfillMarketplaceOrder(supabase: SupabaseClient, order: FulfillOrder) {
  const lines = (order.items || []) as OrderLine[]
  const fulfillable = lines.length > 0 && lines.every((l) => l.cj_vid)
  if (!fulfillable) {
    await supabase.from("marketplace_orders").update({ cj_status: "manual_needed" }).eq("id", order.id)
    return { fulfilled: false as const, cj_order_id: null as string | null }
  }
  try {
    let logisticName = "CJPacket"
    const stored = String(order.ship_method || "")
    if (stored && stored !== "Standard" && stored !== "Express") {
      logisticName = stored
    } else {
      try {
        const live = await supplierShipOptions(
          lines.map((l) => ({ product_id: l.id, variant_vid: l.cj_vid || "", qty: l.qty })),
          String(order.ship_country || "NG")
        )
        if (live.length > 0) logisticName = live[0].name
      } catch {
        // keep CJPacket fallback
      }
    }
    const result = (await cjCreateOrder({
      externalOrderNumber: String(order.id),
      shippingCountry: order.ship_country || "NG",
      shippingAddress: `${order.ship_address || ""} ${order.ship_city || ""}`.trim(),
      shippingCity: order.ship_city || "",
      shippingState: order.ship_state || "",
      shippingZip: order.ship_zip || "",
      shippingCustomerName: order.ship_name || "",
      shippingPhone: order.ship_phone || "",
      logisticName,
      products: lines.map((l) => ({ vid: l.cj_vid as string, quantity: l.qty })),
    })) as { orderId?: string; id?: string } | null
    const cjId = result?.orderId || result?.id || null
    await supabase
      .from("marketplace_orders")
      .update({ cj_order_id: cjId, cj_status: cjId ? "submitted" : "manual_needed", status: cjId ? "fulfilled" : "paid" })
      .eq("id", order.id)
    return { fulfilled: !!cjId, cj_order_id: cjId }
  } catch {
    await supabase.from("marketplace_orders").update({ cj_status: "manual_needed" }).eq("id", order.id)
    return { fulfilled: false as const, cj_order_id: null as string | null }
  }
}
