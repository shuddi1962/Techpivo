import { describe, expect, it } from "vitest"
import { blankCoupon, parseMarketCoupons, validateCoupon, type MarketCoupon } from "@/lib/marketplace-coupons"

const base = (over: Partial<MarketCoupon>): MarketCoupon => ({ ...blankCoupon("SAVE10"), code: "SAVE10", ...over })
const now = Date.now()

describe("parseMarketCoupons", () => {
  it("keeps valid codes, dedupes, caps percent", () => {
    const list = parseMarketCoupons([
      { code: "save10", type: "percent", value: 10 },
      { code: "SAVE10", type: "percent", value: 5 },
      { code: "BIG", type: "percent", value: 150 },
      { code: "x", type: "percent", value: 5 },
      42,
    ])
    expect(list.map((c) => c.code)).toEqual(["SAVE10", "BIG"])
    expect(list.find((c) => c.code === "BIG")!.value).toBe(90)
  })
})

describe("validateCoupon", () => {
  it("applies percent + fixed discounts", () => {
    expect(validateCoupon([base({})], "save10", 100, now)).toMatchObject({ ok: true, discountUsd: 10 })
    expect(validateCoupon([base({ type: "fixed", value: 7.5 })], "SAVE10", 100, now)).toMatchObject({ ok: true, discountUsd: 7.5 })
    // Never discounts more than the subtotal.
    expect(validateCoupon([base({ type: "fixed", value: 500 })], "SAVE10", 100, now)).toMatchObject({ ok: true, discountUsd: 100 })
  })

  it("rejects unknown, inactive, expired, capped, gated codes", () => {
    expect(validateCoupon([base({})], "NOPE", 100, now).ok).toBe(false)
    expect(validateCoupon([base({ active: false })], "SAVE10", 100, now).ok).toBe(false)
    expect(validateCoupon([base({ ends_at: new Date(now - 1000).toISOString() })], "SAVE10", 100, now)).toMatchObject({ ok: false })
    expect(validateCoupon([base({ max_uses: 2, uses: 2 })], "SAVE10", 100, now)).toMatchObject({ ok: false })
    expect(validateCoupon([base({ min_order_usd: 200 })], "SAVE10", 100, now).ok).toBe(false)
    expect(validateCoupon([base({ min_order_usd: 50 })], "SAVE10", 100, now).ok).toBe(true)
  })
})
