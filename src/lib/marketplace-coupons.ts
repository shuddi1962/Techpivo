// TechPivo Market coupons (DB-driven, admin-editable).
// Stored in site_settings under key "marketplace_coupons" as JSON array:
//   [{ code, type: "percent"|"fixed", value, min_order_usd, starts_at,
//      ends_at, max_uses, uses, active }]
// Validation is pure so checkout (server) and the admin preview share it.
// Usage counting is best-effort (incremented when an order is created).
// PURE — no server imports.

export const MARKETPLACE_COUPONS_KEY = "marketplace_coupons"

export interface MarketCoupon {
  id: string
  code: string
  type: "percent" | "fixed"
  /** percent 1-90, or fixed USD amount. */
  value: number
  min_order_usd: number
  starts_at: string
  ends_at: string
  max_uses: number
  uses: number
  active: boolean
}

export function blankCoupon(code = ""): MarketCoupon {
  return {
    id: `cp${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    code: code.toUpperCase(),
    type: "percent",
    value: 10,
    min_order_usd: 0,
    starts_at: "",
    ends_at: "",
    max_uses: 0,
    uses: 0,
    active: true,
  }
}

function cleanCoupon(v: unknown): MarketCoupon | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null
  const r = v as Record<string, unknown>
  const code = typeof r.code === "string" ? r.code.trim().toUpperCase().slice(0, 24) : ""
  if (!/^[A-Z0-9-]{2,24}$/.test(code)) return null
  const type = r.type === "fixed" ? "fixed" : "percent"
  const num = (x: unknown, fb: number) => (Number.isFinite(Number(x)) ? Number(x) : fb)
  const value = Math.max(0, num(r.value, 0))
  const id = typeof r.id === "string" && r.id.trim() ? r.id.trim().slice(0, 40) : code
  return {
    id,
    code,
    type,
    value: type === "percent" ? Math.min(90, value) : Math.round(value * 100) / 100,
    min_order_usd: Math.max(0, num(r.min_order_usd, 0)),
    starts_at: typeof r.starts_at === "string" && Number.isFinite(Date.parse(r.starts_at)) ? new Date(r.starts_at).toISOString() : "",
    ends_at: typeof r.ends_at === "string" && Number.isFinite(Date.parse(r.ends_at)) ? new Date(r.ends_at).toISOString() : "",
    max_uses: Math.max(0, Math.floor(num(r.max_uses, 0))),
    uses: Math.max(0, Math.floor(num(r.uses, 0))),
    active: typeof r.active === "boolean" ? r.active : true,
  }
}

export function parseMarketCoupons(raw: unknown): MarketCoupon[] {
  if (!Array.isArray(raw)) return []
  const out: MarketCoupon[] = []
  const seen = new Set<string>()
  for (const x of raw) {
    if (out.length >= 200) break
    const c = cleanCoupon(x)
    if (c && !seen.has(c.code)) {
      seen.add(c.code)
      out.push(c)
    }
  }
  return out
}

export interface CouponCheck {
  ok: boolean
  coupon: MarketCoupon | null
  /** USD discount for this subtotal (0 when not ok). */
  discountUsd: number
  reason: string
}

/** Validate a code against the subtotal (pure — checkout re-runs this). */
export function validateCoupon(
  coupons: MarketCoupon[] | null | undefined,
  code: string,
  subtotalUsd: number,
  now = Date.now()
): CouponCheck {
  const fail = (reason: string): CouponCheck => ({ ok: false, coupon: null, discountUsd: 0, reason })
  const want = code.trim().toUpperCase()
  if (!want) return fail("Enter a coupon code.")
  const c = (coupons || []).find((x) => x.code === want)
  if (!c) return fail("That code is not valid.")
  if (!c.active) return fail("That code is no longer active.")
  if (c.starts_at && now < Date.parse(c.starts_at)) return fail("That code is not live yet.")
  if (c.ends_at && now > Date.parse(c.ends_at)) return fail("That code has expired.")
  if (c.max_uses > 0 && c.uses >= c.max_uses) return fail("That code has reached its usage limit.")
  if (subtotalUsd + 0.001 < c.min_order_usd) {
    return fail(`Needs a minimum order of $${c.min_order_usd.toFixed(2)}.`)
  }
  const raw = c.type === "percent" ? (subtotalUsd * c.value) / 100 : c.value
  const discountUsd = Math.min(subtotalUsd, Math.round(raw * 100) / 100)
  if (discountUsd <= 0) return fail("That code gives no discount on this order.")
  return { ok: true, coupon: c, discountUsd, reason: "" }
}
