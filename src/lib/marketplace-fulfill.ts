// Shared CJ auto-fulfillment for marketplace orders (server-side only).
// Used by the verify endpoint (redirect flow), the Korapay webhook, and the
// admin fulfill-retry action. Failures are recorded in fulfill_error so the
// admin orders tab can show WHY plus a Retry button.

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

function fail(supabase: SupabaseClient, orderId: string, reason: string) {
  const msg = String(reason || "fulfillment failed").slice(0, 500)
  return supabase
    .from("marketplace_orders")
    .update({ cj_status: "manual_needed", fulfill_error: msg })
    .eq("id", orderId)
    .then(() => ({ fulfilled: false as const, cj_order_id: null as string | null, error: msg }))
}

async function supabaseUpdate(supabase: SupabaseClient, orderId: string, patch: Record<string, unknown>) {
  await supabase.from("marketplace_orders").update(patch).eq("id", orderId)
}

export async function fulfillMarketplaceOrder(supabase: SupabaseClient, order: FulfillOrder) {
  const lines = (order.items || []) as OrderLine[]
  const fulfillable = lines.length > 0 && lines.every((l) => l.cj_vid)
  if (!fulfillable) {
    return fail(supabase, order.id, "Not auto-fulfillable: a line has no supplier variant id.")
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
    let result: { orderId?: string; id?: string } | null = null
    try {
      result = (await cjCreateOrder({
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : "CJ order create failed"
      return fail(supabase, order.id, `CJ: ${msg}`)
    }
    const cjId = result?.orderId || result?.id || null
    if (!cjId) {
      return fail(supabase, order.id, "CJ accepted the request but returned no order id.")
    }
    await supabaseUpdate(supabase, order.id, {
      cj_order_id: cjId,
      cj_status: "submitted",
      status: "fulfilled",
      fulfill_error: null,
    })
    return { fulfilled: true as const, cj_order_id: cjId, error: null as string | null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fulfillment failed"
    return fail(supabase, order.id, msg)
  }
}
