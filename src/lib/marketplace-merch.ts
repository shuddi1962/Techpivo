// TechPivo Market merchandising flags (DB-driven, admin-editable).
// Stored in site_settings under key "marketplace_merch" as JSON:
//   { "_global": { "sale_badges": true },
//     "<productId>": { "sale": true, "is_new": false, "bestseller": false } }
// Lets the admin decide, per product, whether the discount shows, and
// whether it leads New Arrivals / Best Sellers — instead of every price
// difference automatically becoming a badge everywhere. The store-wide
// "_global.sale_badges" kill-switch hides every discount badge +
// strikethrough + sale countdown at once (per-product flags still apply
// when it is back on). Missing flags = defaults (everything ON, no pins),
// so old rows keep working. PURE.

export const MARKETPLACE_MERCH_KEY = "marketplace_merch"

/** Reserved key inside the merch JSON holding the store-wide switch. */
export const MARKET_MERCH_GLOBAL_KEY = "_global"

export interface MerchFlags {
  /** Show the -% badge + strikethrough when prices differ. Default false (opt-in per product). */
  sale?: boolean
  /** Discount percentage to show (computes the struck-through price from sale_price when set). */
  sale_pct?: number
  /** Feature in New Arrivals ahead of recency. Default false. */
  is_new?: boolean
  /** Feature in Best Sellers ahead of popularity. Default false. */
  bestseller?: boolean
}

/** Resolved discount for one product: explicit admin `sale_pct` wins, else the
   percentage computed from `oldPrice`/`price`. Always returns pct=0 when the
   product is not opted in for a badge. */
export interface Discount { pct: number; oldPrice: number | null }
export function productDiscount(
  p: { price: number; oldPrice?: number; sale_pct?: number },
  merch: MarketMerch | null | undefined,
  productId: string
): Discount {
  const merchPct = salePctOf(merch, productId)
  const productPct = p.sale_pct != null && Number.isFinite(p.sale_pct) && p.sale_pct > 0 && p.sale_pct < 100 ? Math.round(p.sale_pct) : null
  const pct = productPct ?? merchPct
  if (Number.isFinite(pct) && pct > 0 && pct < 100) {
    return { pct, oldPrice: computeOldPrice(p.price, pct) ?? null }
  }
  if (p.oldPrice && p.oldPrice > p.price) {
    return { pct: Math.round((1 - p.price / p.oldPrice) * 100), oldPrice: p.oldPrice }
  }
  return { pct: 0, oldPrice: null }
}

export type MarketMerch = Record<string, MerchFlags>

const UUID_RE = /^[0-9a-f-]{36}$/i

function cleanFlags(v: unknown): MerchFlags | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null
  const r = v as Record<string, unknown>
  const out: MerchFlags = {}
  if (typeof r.sale === "boolean") out.sale = r.sale
  const pct = Number(r.sale_pct)
  if (Number.isFinite(pct) && pct > 0 && pct < 100) out.sale_pct = Math.round(pct)
  if (typeof r.is_new === "boolean") out.is_new = r.is_new
  if (typeof r.bestseller === "boolean") out.bestseller = r.bestseller
  // Legacy/alternate key spellings admins might type.
  if (out.is_new === undefined && typeof r.new === "boolean") out.is_new = r.new
  if (out.bestseller === undefined && typeof r.best_seller === "boolean") out.bestseller = r.best_seller
  return out
}

export function parseMarketMerch(raw: unknown): MarketMerch {
  const out: MarketMerch = {}
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!UUID_RE.test(k.trim())) continue
    const f = cleanFlags(v)
    if (!f) continue
    if (Object.keys(out).length >= 1000) break
    out[k.trim()] = f
  }
  return out
}

/** Discount badge + strikethrough may show for this product. Default OFF —
   the admin must opt each product in (or flip the store-wide switch back on
   after it was already opted in). */
export function saleBadgeOn(merch: MarketMerch | null | undefined, productId: string): boolean {
  return merch?.[productId]?.sale === true
}

/** Discount percentage stored for a product (0 when none). */
export function salePctOf(merch: MarketMerch | null | undefined, productId: string): number {
  const pct = merch?.[productId]?.sale_pct
  return pct != null && Number.isFinite(pct) && pct > 0 && pct < 100 ? Math.round(pct) : 0
}

/** Compute the struck-through "original" price from a sale price + pct. */
export function computeOldPrice(salePrice: number, pct: number): number | null {
  if (!Number.isFinite(salePrice) || salePrice <= 0) return null
  if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) return null
  return Math.round((salePrice / (1 - pct / 100)) * 100) / 100
}

/** Store-wide discount-badge kill-switch. Defaults ON (badges show). */
export function parseMarketMerchGlobal(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return true
  const g = (raw as Record<string, unknown>)[MARKET_MERCH_GLOBAL_KEY]
  if (!g || typeof g !== "object" || Array.isArray(g)) return true
  const v = (g as Record<string, unknown>).sale_badges
  return v !== false
}

/**
 * Effective discount display for a product: the global switch AND the
 * per-product flag must both allow it. Gate every badge, strikethrough
 * and sale countdown behind this — never behind saleBadgeOn alone.
 */
export function showSaleBadge(
  saleBadgesOn: boolean | null | undefined,
  merch: MarketMerch | null | undefined,
  productId: string
): boolean {
  return saleBadgesOn !== false && saleBadgeOn(merch, productId)
}

/** Pinned to the front of New Arrivals by the admin. */
export function isNewPick(merch: MarketMerch | null | undefined, productId: string): boolean {
  return merch?.[productId]?.is_new === true
}

/** Pinned to the front of Best Sellers by the admin. */
export function isBestsellerPick(merch: MarketMerch | null | undefined, productId: string): boolean {
  return merch?.[productId]?.bestseller === true
}
