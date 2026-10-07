// Shared CJ auto-fulfillment for marketplace orders (server-side only).
// Used by the verify endpoint (redirect flow), the Korapay webhook, and the
// admin fulfill-retry action. Failures are recorded in fulfill_error so the
// admin orders tab can show WHY plus a Retry button.

import type { SupabaseClient } from "@supabase/supabase-js"
import { cjCreateOrder } from "@/lib/cj"
import { supplierShipOptions } from "@/lib/marketplace-freight"
import { SHIP_COUNTRIES } from "@/lib/marketplace-shipping"

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
    let result: { orderId?: string; id?: string; orderNum?: string } | string | null = null
    try {
      const countryCode = String(order.ship_country || "NG").toUpperCase().slice(0, 2) || "NG"
      const countryName =
        SHIP_COUNTRIES.find((c) => c.code === countryCode)?.name || countryCode
      const province = String(order.ship_state || order.ship_city || countryName).slice(0, 50)
      const city = String(order.ship_city || order.ship_state || countryName).slice(0, 50)
      const phone = String(order.ship_phone || "").replace(/[^\d]/g, "").slice(0, 20)
      result = (await cjCreateOrder({
        orderNumber: String(order.id).slice(0, 50),
        shippingCountryCode: countryCode,
        shippingCountry: countryName.slice(0, 50),
        shippingProvince: province,
        shippingCity: city,
        shippingAddress: String(order.ship_address || `${city}, ${countryName}`).slice(0, 200),
        shippingAddress2: String(order.ship_state || "").slice(0, 200),
        shippingCustomerName: String(order.ship_name || "Customer").slice(0, 50),
        shippingPhone: phone,
        shippingZip: String(order.ship_zip || "").slice(0, 20),
        logisticName: logisticName.slice(0, 50),
        fromCountryCode: "CN",
        products: lines.map((l) => ({ vid: l.cj_vid as string, quantity: l.qty })),
        remark: `TechPivo Market ${String(order.id).slice(0, 8)}`,
      })) as { orderId?: string; id?: string; orderNum?: string } | string | null
    } catch (e) {
      const msg = e instanceof Error ? e.message : "CJ order create failed"
      return fail(supabase, order.id, `CJ: ${msg}`)
    }
    // CJ v1 createOrder returns data as a PLAIN STRING (the CJ order id),
    // not an object — accept a non-empty string directly.
    const cjId =
      typeof result === "string"
        ? result.trim() || null
        : result?.orderId || result?.id || result?.orderNum || null
    if (!cjId) {
      const keys = result && typeof result === "object" ? Object.keys(result).join(",") : typeof result
      return fail(supabase, order.id, `CJ accepted the request but returned no order id (fields: ${keys}).`)
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
