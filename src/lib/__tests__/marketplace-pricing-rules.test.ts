import { describe, expect, it } from "vitest"
import { withMargin, withFreightMarkup, MARKET_MIN_MARGIN_USD } from "@/lib/cj"
import { standardFee, STANDARD_FLAT_USD, FREE_SHIP_THRESHOLD_USD } from "@/lib/marketplace-shipping"

describe("marketplace pricing rules", () => {
  it("applies a 20% margin on expensive items", () => {
    expect(withMargin(100)).toBe(120)
  })

  it(`floors cheap items at cost + $${MARKET_MIN_MARGIN_USD}`, () => {
    // $1.79 × 1.2 = $2.15 would leave pennies after gateway fees
    expect(withMargin(1.79)).toBe(3.29)
    expect(withMargin(1.79) - 1.79).toBeGreaterThanOrEqual(MARKET_MIN_MARGIN_USD)
  })

  it("marks freight up 35% so shipping earns", () => {
    expect(withFreightMarkup(8.61)).toBeCloseTo(11.62, 2)
  })

  it("charges the $9 standard flat below the free-shipping threshold", () => {
    expect(STANDARD_FLAT_USD).toBe(9)
    expect(standardFee(2.15)).toBe(9)
    expect(standardFee(FREE_SHIP_THRESHOLD_USD)).toBe(0)
  })
})
