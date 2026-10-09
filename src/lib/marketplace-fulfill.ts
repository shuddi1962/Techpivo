// Shared CJ auto-fulfillment for marketplace orders (server-side only).
// Used by the verify endpoint (redirect flow), the Korapay webhook, and the
// admin fulfill-retry action. Failures are recorded in fulfill_error so the
// admin orders tab can show WHY plus a Retry button.

import type { SupabaseClient } from "@supabase/supabase-js"
import { cjCreateOrder, cjGetVariants } from "@/lib/cj"
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * CJ throttles variant lookups (HTTP 429) when several fire at once.
 * Stagger + retry so a busy supplier API degrades to "try again" rather
 * than a permanent manual block.
 */
async function cjVariantsResilient(pid: string): Promise<Array<{ vid?: string; variantNameEn?: string }>> {
  let lastErr: unknown = null
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(900 * attempt)
    try {
      return await cjGetVariants(pid)
    } catch (e) {
      lastErr = e
      const msg = e instanceof Error ? e.message : ""
      // Only rate/throughput errors are worth retrying; auth/config
      // errors would fail identically on every attempt.
      if (!/429|rate|throttl|too many|timeout|network|fetch failed/i.test(msg)) break
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("CJ variant lookup failed")
}

async function supabaseUpdate(supabase: SupabaseClient, orderId: string, patch: Record<string, unknown>) {
  await supabase.from("marketplace_orders").update(patch).eq("id", orderId)
}

/**
 * Fill in missing supplier variant ids where it is safe to do so.
 * Resolution order per line: product default cj_vid -> the single CJ
 * variant (nothing to choose between) -> unique match of the stored
 * variant label ("Name (Label)") against CJ variantNameEn. Anything
 * ambiguous is left empty for a human. Healed vids are written back to
 * the order so retries and tracking see the same lines CJ received.
 */
async function healMissingVids(
  supabase: SupabaseClient,
  orderId: string,
  lines: OrderLine[]
): Promise<{ lines: OrderLine[] }> {
  if (!lines.some((l) => !l.cj_vid)) return { lines }
  let changed = false
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
        variants = await cjVariantsResilient(row.cj_pid)
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
        }
      }
    } catch {
      // never let healing break fulfillment — line stays manual
    }
  }
  if (changed) {
    await supabaseUpdate(supabase, orderId, { items: next })
  }
  return { lines: next }
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
  const stillMissing = healed.lines.filter((l) => !l.cj_vid)
  if (stillMissing.length > 0) {
    const names = [...new Set(stillMissing.map((l) => (l.name || "an item").slice(0, 60)))].slice(0, 3).join("; ")
    return fail(
      supabase,
      order.id,
      `Not auto-fulfillable: no supplier variant for ${names}. Pick the variant in Admin → Marketplace → CJ Import (or fulfill manually).`
    )
  }
  const fulfillLines = healed.lines
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
        products: fulfillLines.map((l) => ({ vid: l.cj_vid as string, quantity: l.qty })),
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
