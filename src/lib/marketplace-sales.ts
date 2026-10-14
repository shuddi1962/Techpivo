// TechPivo Market — per-product sale countdowns (DB-driven, admin-editable).
// Stored in site_settings under key "marketplace_sales" as JSON:
//   { "<productId>": "<ISO end datetime>" }
// The discount itself comes from the product's sale_price / original_price
// (Admin → Marketplace → Products); this map only attaches the urgency
// timer big stores show under a deal ("Sale ends in 04:12:33").
// Empty / missing / past dates = no timer. CLIENT-SAFE (pure + fetch only).

export const MARKETPLACE_SALES_KEY = "marketplace_sales"

/** productId → ISO end datetime. */
export type MarketSales = Record<string, string>

export function parseMarketSales(raw: unknown): MarketSales {
  const out: MarketSales = {}
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== "string" || !v.trim()) continue
    if (!/^[0-9a-f-]{36}$/i.test(k.trim())) continue
    const ms = Date.parse(v.trim())
    if (!Number.isFinite(ms)) continue
    if (Object.keys(out).length >= 500) break
    out[k.trim()] = new Date(ms).toISOString()
  }
  return out
}

/** Seconds left on a product's sale timer (0 = none or ended). */
export function saleSecondsLeft(sales: MarketSales | null | undefined, productId: string, now = Date.now()): number {
  const end = sales?.[productId]
  if (!end) return 0
  const ms = Date.parse(end)
  if (!Number.isFinite(ms)) return 0
  return Math.max(0, Math.floor((ms - now) / 1000))
}

// --- client hook (single shared fetch, cached per page load) ---------------

let cached: MarketSales | null = null
let inflight: Promise<MarketSales> | null = null

export function getMarketSales(): Promise<MarketSales> {
  if (cached) return Promise.resolve(cached)
  if (inflight) return inflight
  inflight = fetch("/api/marketplace/sales")
    .then((r) => r.json())
    .then((d) => {
      cached = parseMarketSales(d?.sales)
      return cached
    })
    .catch(() => {
      cached = {}
      return cached
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function setMarketSalesCache(next: MarketSales) {
  cached = { ...next }
}
