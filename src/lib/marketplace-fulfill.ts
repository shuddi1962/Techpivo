// Shared CJ auto-fulfillment for marketplace orders (server-side only).
// Used by the verify endpoint (redirect flow), the payment webhook, and the
// admin fulfill-retry action. Failures are recorded in fulfill_error so the
// admin orders tab can show WHY plus a Retry button.

import type { SupabaseClient } from "@supabase/supabase-js"
import { cjCreateOrder, cjFetchOrderSnapshot, cjGetVariantsResilient, pickDefaultVariant } from "@/lib/cj"
import { supplierShipOptions } from "@/lib/marketplace-freight"
import { SHIP_COUNTRIES } from "@/lib/marketplace-shipping"

interface OrderLine {
  id: string
  name: string
  qty: number
  cj_pid?: string | null
  cj_vid?: string | null
  /** Set once this line has been handed to the supplier (no double-shipping). */
  cj_sent?: boolean
}

interface FulfillOrder {
  id: string
  items?: unknown
  email?: string | null
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
    // Release the lock so the admin can retry immediately.
    .update({ cj_status: "manual_needed", fulfill_error: msg, fulfill_lock_at: null })
    .eq("id", orderId)
    .then(() => ({ fulfilled: false as const, cj_order_id: null as string | null, error: msg }))
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function supabaseUpdate(supabase: SupabaseClient, orderId: string, patch: Record<string, unknown>) {
  await supabase.from("marketplace_orders").update(patch).eq("id", orderId)
}

/**
 * Fill in missing supplier variant ids where it is safe to do so.
 * Resolution order per line: product default cj_vid -> the single CJ
 * variant (nothing to choose between) -> unique match of the stored
 * variant label ("Name (Label)") against CJ variantNameEn -> the cheapest
 * CJ variant as a last resort. The last resort matters: without ANY
 * variant the order can never be placed with CJ, so a multi-item order
 * would sit in "manual_needed" forever. Healed vids are written back to
 * the order so retries and tracking see the same lines CJ received.
 */
async function healMissingVids(
  supabase: SupabaseClient,
  orderId: string,
  lines: OrderLine[]
): Promise<{ lines: OrderLine[]; fallbacks: string[] }> {
  if (!lines.some((l) => !l.cj_vid)) return { lines, fallbacks: [] }
  let changed = false
  const fallbacks: string[] = []
  const next: OrderLine[] = [...lines]
  for (let i = 0; i < next.length; i++) {
    const line = next[i]
    if (line.cj_vid) continue
    try {
      const { data: product } = await supabase
        .from("affiliate_products")
        .select("cj_pid,cj_vid")
        .eq("id", line.id)
        .maybeSingle()
      const row = product as { cj_pid?: string | null; cj_vid?: string | null } | null
      if (row?.cj_vid) {
        next[i] = { ...line, cj_vid: row.cj_vid }
        changed = true
        continue
      }
      if (!row?.cj_pid) continue // not a CJ-supplied product — stays manual
      // One lookup at a time: CJ rate-limits burst variant queries.
      if (i > 0) await sleep(600)
      let variants: Array<{ vid?: string; variantNameEn?: string }> = []
      try {
        variants = await cjGetVariantsResilient(row.cj_pid)
      } catch {
        continue // supplier unreachable — retry later, keep manual for now
      }
      const withVid = variants.filter((v) => v.vid)
      if (withVid.length === 1 && withVid[0].vid) {
        next[i] = { ...line, cj_vid: withVid[0].vid as string }
        changed = true
        continue
      }
      // Line names embed the picked option: "Product Name (Option Label)".
      const labelMatch = /\(([^()]*)\)\s*$/.exec(line.name || "")
      const label = (labelMatch?.[1] || "").trim().toLowerCase()
      if (label && withVid.length > 1) {
        const hits = withVid.filter((v) => {
          const vn = (v.variantNameEn || "").trim().toLowerCase()
          return vn.length > 0 && (vn.includes(label) || label.includes(vn))
        })
        if (hits.length === 1 && hits[0].vid) {
          next[i] = { ...line, cj_vid: hits[0].vid as string }
          changed = true
          continue
        }
      }
      // Last resort: ship the cheapest variant CJ offers. Without a variant
      // the order can never be placed with CJ at all, so a blocked order
      // (and a customer waiting forever) is the worse outcome. The admin
      // sees a warning in fulfill_error so it can be corrected by hand.
      const fallback = pickDefaultVariant(withVid)
      if (fallback) {
        next[i] = { ...line, cj_vid: fallback }
        changed = true
        fallbacks.push((line.name || "an item").slice(0, 60))
      }
    } catch {
      // never let healing break fulfillment — line stays manual
    }
  }
  if (changed) {
    await supabaseUpdate(supabase, orderId, { items: next })
  }
  return { lines: next, fallbacks }
}

export async function fulfillMarketplaceOrder(supabase: SupabaseClient, order: FulfillOrder) {
  const lines = (order.items || []) as OrderLine[]
  if (lines.length === 0) {
    return fail(supabase, order.id, "Not auto-fulfillable: the order has no items.")
  }
  // Self-heal: upsell add-ons and quick adds often reach checkout without a
  // picked variant, so lines can arrive with no cj_vid even though the
  // product is CJ-supplied. Resolve what's safely resolvable (product
  // default -> single supplier variant -> unique variant-name match) and
  // persist it, so Retry actually makes progress instead of failing forever.
  const healed = await healMissingVids(supabase, order.id, lines)
  // Lines already handed to the supplier are never sent twice — a retry only
  // ships what is still outstanding.
  const outstanding = healed.lines.filter((l) => l.cj_sent !== true)
  if (outstanding.length === 0) {
    // Everything has already been handed to the supplier.
    return { fulfilled: true as const, cj_order_id: (order as { cj_order_id?: string | null }).cj_order_id ?? null, error: null as string | null }
  }
  const ready = outstanding.filter((l) => l.cj_vid)
  const stillMissing = outstanding.filter((l) => !l.cj_vid)
  if (ready.length === 0) {
    const names = [...new Set(stillMissing.map((l) => (l.name || "an item").slice(0, 60)))].slice(0, 3).join("; ")
    return fail(
      supabase,
      order.id,
      `Not auto-fulfillable: no supplier variant for ${names}. Pick the variant in Admin → Marketplace → Orders (or fulfill manually).`
    )
  }

  // Idempotency lock: only one attempt may talk to the supplier for an
  // order at a time. Without this, two simultaneous verify/webhook calls
  // place TWO real supplier orders for one paid order (double cost).
  const staleIso = new Date(Date.now() - 2 * 60 * 1000).toISOString()
  const { data: claimed } = await supabase
    .from("marketplace_orders")
    .update({ fulfill_lock_at: new Date().toISOString() })
    .eq("id", order.id)
    .or(`fulfill_lock_at.is.null,fulfill_lock_at.lt.${staleIso}`)
    .select("id")
  if (!claimed || claimed.length === 0) {
    return {
      fulfilled: false as const,
      cj_order_id: null as string | null,
      error: "Fulfillment already in progress for this order — give it a moment before retrying.",
    }
  }

  const fulfillLines = ready
  try {
    let logisticName = "CJPacket"
    const stored = String(order.ship_method || "")
    if (stored && stored !== "Standard" && stored !== "Express") {
      logisticName = stored
    } else {
      try {
        const live = await supplierShipOptions(
          fulfillLines.map((l) => ({ product_id: l.id, variant_vid: l.cj_vid || "", qty: l.qty })),
          String(order.ship_country || "NG")
        )
        if (live.length > 0) logisticName = live[0].name
      } catch {
        // keep CJPacket fallback
      }
    }
    let result: Awaited<ReturnType<typeof cjCreateOrder>> | null = null
    try {
      const countryCode = String(order.ship_country || "NG").toUpperCase().slice(0, 2) || "NG"
      const countryName =
        SHIP_COUNTRIES.find((c) => c.code === countryCode)?.name || countryCode
      const province = String(order.ship_state || order.ship_city || countryName).slice(0, 50)
      const city = String(order.ship_city || order.ship_state || countryName).slice(0, 50)
      const phone = String(order.ship_phone || "").replace(/[^\d]/g, "").slice(0, 20)
      result = await cjCreateOrder({
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
        products: fulfillLines.map((l) => ({ vid: l.cj_vid as string, quantity: l.qty })),
        remark: `TechPivo Market ${String(order.id).slice(0, 8)}`,
        email: String((order as { email?: string | null }).email || "").slice(0, 50) || undefined,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "CJ order create failed"
      return fail(supabase, order.id, `CJ: ${msg}`)
    }
    // `orderId` is CJ's own id (what getOrderDetail expects); `cjOrderId` is
    // the SD… reference the CJ platform shows.
    let cjId = result?.orderId || null
    let cjRef = result?.cjOrderId || null
    // CJ only hands out the SD… reference once the order exists on their
    // side — read it back with our own order number so the merchant can find
    // the order in the CJ dashboard.
    if (!cjRef || !cjId) {
      try {
        const snap = await cjFetchOrderSnapshot(String(order.id))
        if (snap?.cjOrderId && !cjRef) cjRef = snap.cjOrderId
        if (snap?.orderId && !cjId) cjId = snap.orderId
      } catch {
        // the reference is a nicety — the order itself was placed
      }
    }
    if (!cjId) {
      return fail(supabase, order.id, "CJ accepted the request but returned no order id.")
    }
    // Mark the lines we just handed to the supplier so a later retry never
    // ships them twice.
    const sentIds = new Set(fulfillLines.map((l) => l.id))
    const nextItems = healed.lines.map((l) => (sentIds.has(l.id) ? { ...l, cj_sent: true } : l))
    const remaining = nextItems.filter((l) => l.cj_sent !== true)
    // A fallback variant means the shopper's exact option could not be
    // matched — the admin must confirm the variant that shipped.
    const fallbackWarning =
      healed.fallbacks.length > 0
        ? ` Default (cheapest) supplier variant used for: ${healed.fallbacks.join("; ").slice(0, 200)} — confirm the option matches the order.`
        : ""
    await supabaseUpdate(supabase, order.id, {
      items: nextItems,
      cj_order_id: cjId,
      cj_order_ref: cjRef,
      cj_status: remaining.length > 0 ? "partially_submitted" : "submitted",
      status: remaining.length > 0 ? "paid" : "fulfilled",
      fulfill_error:
        remaining.length > 0
          ? `${fulfillLines.length} line(s) sent to CJ (${cjRef || cjId}). Still waiting on a supplier variant for: ${remaining
              .map((l) => (l.name || "an item").slice(0, 50))
              .join("; ")
              .slice(0, 300)} — pick the variant and hit Retry to send the rest.${fallbackWarning}`
          : fallbackWarning || null,
      fulfill_lock_at: null,
    })
    return { fulfilled: true as const, cj_order_id: cjId, error: null as string | null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fulfillment failed"
    return fail(supabase, order.id, msg)
  }
}
