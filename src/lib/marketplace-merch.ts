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
  /** Show the -% badge + strikethrough when prices differ. Default true. */
  sale?: boolean
  /** Feature in New Arrivals ahead of recency. Default false. */
  is_new?: boolean
  /** Feature in Best Sellers ahead of popularity. Default false. */
  bestseller?: boolean
}

export type MarketMerch = Record<string, MerchFlags>

const UUID_RE = /^[0-9a-f-]{36}$/i

function cleanFlags(v: unknown): MerchFlags | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null
  const r = v as Record<string, unknown>
  const out: MerchFlags = {}
  if (typeof r.sale === "boolean") out.sale = r.sale
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

/** Discount badge + strikethrough may show for this product. */
export function saleBadgeOn(merch: MarketMerch | null | undefined, productId: string): boolean {
  return merch?.[productId]?.sale !== false
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
