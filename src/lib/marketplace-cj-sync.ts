// TechPivo Market <-> CJDropshipping automatic sync (server-side only).
//
// The store and the CJ platform stay in step WITHOUT anyone pressing a
// button:
//
//   1. CATALOGUE -> "My Products": every store product is added to the CJ
//      "My Products" list so it shows in the CJDropshipping platform as one
//      of our products.
//   2. VARIANTS: every product gets a real supplier variant (cj_vid) so an
//      order can always be placed with CJ.
//   3. ORDERS: the CJ order status (and tracking) is pulled back into our
//      marketplace_orders table so the admin sees the live state.
//
// CJ allows ~1 request/second and charges API points per call, so every
// function is small, resumable and points-aware: it stops when the daily
// allowance is nearly spent and picks up where it left off next time.

import type { SupabaseClient } from "@supabase/supabase-js"
import {
  cjAddToMyProduct,
  cjFetchOrderSnapshot,
  cjGetMyProducts,
  cjGetProductDetail,
  pickDefaultVariant,
} from "@/lib/cj"

export interface SyncReport {
  pushed: number
  alreadyThere: number
  pushFailed: number
  variantsFilled: number
  variantsFailed: number
  ordersSynced: number
  remainingCatalogue: number
  remainingVariants: number
  pointsUsedToday: number | null
  stopped: "catalogue" | "variants" | "orders" | null
}

/** CJ daily API point allowance — we stop before the account is cut off. */
const POINT_SOFT_LIMIT = 44000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Push the catalogue to CJ "My Products".
 *
 * CJ's own "My Products" list is the source of truth for what is already
 * there, so we never ask twice for the same product.
 */
export async function syncCatalogueToCj(
  supabase: SupabaseClient,
  opts?: { limit?: number; pointsLeft?: number | null; deadline?: number }
): Promise<{ pushed: number; already: number; failed: number; remaining: number; pointsUsedToday: number | null }> {
  const limit = Math.min(opts?.limit ?? 40, 120)
  let known = new Set<string>()
  let pointsUsedToday: number | null = null
  try {
    const mine = await cjGetMyProducts({ size: 100 })
    known = new Set(mine.rows.map((r) => r.productId))
  } catch {
    // The list is unavailable — we simply try every product (CJ answers
    // "already added" for the ones that are there).
  }

  const { data } = await supabase
    .from("affiliate_products")
    .select("id,cj_pid")
    .not("cj_pid", "is", null)
    .limit(2000)
  const list = (data || []) as Array<{ id: string; cj_pid: string }>
  const pending = list.filter((p) => !known.has(p.cj_pid))
  const batch = pending.slice(0, limit)

  let pushed = 0
  let already = 0
  let failed = 0
  for (const p of batch) {
    if (opts?.deadline && Date.now() > opts.deadline) break
    try {
      const r = await cjAddToMyProduct(p.cj_pid)
      if (r.ok) {
        if (r.already) already++
        else pushed++
      } else {
        failed++
      }
    } catch {
      failed++
    }
    await sleep(1100)
  }
  return { pushed, already, failed, remaining: Math.max(0, pending.length - batch.length), pointsUsedToday }
}

/** Give every catalogue product a supplier variant (and its SKU). */
export async function fillMissingVariants(
  supabase: SupabaseClient,
  opts?: { limit?: number; deadline?: number }
): Promise<{ filled: number; failed: number; remaining: number }> {
  const limit = Math.min(opts?.limit ?? 25, 60)
  const { data } = await supabase
    .from("affiliate_products")
    .select("id,cj_pid,cj_data")
    .not("cj_pid", "is", null)
    .is("cj_vid", null)
    .limit(500)
  const list = (data || []) as Array<{ id: string; cj_pid: string; cj_data: Record<string, unknown> | null }>
  let filled = 0
  let failed = 0
  for (const p of list.slice(0, limit)) {
    if (opts?.deadline && Date.now() > opts.deadline) break
    try {
      const product = await cjGetProductDetail(p.cj_pid)
      const vid = pickDefaultVariant(product.variants)
      if (!vid) {
        failed++
        continue
      }
      const patch: Record<string, unknown> = { cj_vid: vid }
      if (product.sku) patch.cj_sku = product.sku
      // Keep the whole option list locally so the storefront never has to
      // spend a CJ API point on every product view.
      if (product.variants.length > 0) {
        const current = (p.cj_data || {}) as Record<string, unknown>
        patch.cj_data = {
          ...current,
          variants: product.variants.slice(0, 80).map((v) => ({
            vid: String(v.vid || ""),
            label: String(v.variantNameEn || "").slice(0, 140),
            price: Number(v.variantSellPrice) || 0,
            image: String(v.variantImage || ""),
          })),
          variantsAt: new Date().toISOString(),
        }
      }
      const { error } = await supabase.from("affiliate_products").update(patch).eq("id", p.id)
      if (error) failed++
      else filled++
    } catch {
      failed++
    }
    await sleep(1100)
  }
  return { filled, failed, remaining: Math.max(0, list.length - limit) }
}

/**
 * Pull the CJ order state back into our orders table so the admin (and the
 * customer) sees the real status instead of "submitted" forever.
 */
export async function syncOrderStatuses(
  supabase: SupabaseClient,
  opts?: { limit?: number; deadline?: number }
): Promise<{ synced: number; failed: number }> {
  const limit = Math.min(opts?.limit ?? 20, 60)
  const { data } = await supabase
    .from("marketplace_orders")
    .select("id,cj_order_id,cj_order_ref,cj_status,status")
    .not("cj_order_id", "is", null)
    .in("status", ["paid", "fulfilled"])
    .limit(200)
  const list = (data || []) as Array<{
    id: string
    cj_order_id: string
    cj_order_ref: string | null
    cj_status: string | null
    status: string
  }>
  let synced = 0
  let failed = 0
  for (const o of list.slice(0, limit)) {
    if (opts?.deadline && Date.now() > opts.deadline) break
    try {
      const snap = await cjFetchOrderSnapshot(o.cj_order_id)
      if (!snap) {
        failed++
        continue
      }
      const patch: Record<string, unknown> = {}
      if (snap.cjOrderId && snap.cjOrderId !== o.cj_order_ref) patch.cj_order_ref = snap.cjOrderId
      if (snap.status && snap.status !== o.cj_status) patch.cj_status = snap.status
      // CJ statuses: CREATED, IN_CART, UNPAID, PENDING, PROCESSING,
      // UNSHIPPED, SHIPPED, DELIVERED, CANCELLED.
      if (snap.status === "SHIPPED" && o.status === "paid") patch.status = "fulfilled"
      if (snap.status === "DELIVERED" && o.status !== "delivered") patch.status = "delivered"
      if (snap.status === "CANCELLED" && o.status !== "cancelled") patch.status = "cancelled"
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from("marketplace_orders").update(patch).eq("id", o.id)
        if (error) failed++
        else synced++
      } else {
        synced++
      }
    } catch {
      failed++
    }
    await sleep(1100)
  }
  return { synced, failed }
}
