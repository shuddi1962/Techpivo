import { describe, expect, it } from "vitest"
import { parseMarketSales, saleSecondsLeft } from "@/lib/marketplace-sales"

const ID = "123e4567-e89b-12d3-a456-426614174000"

describe("parseMarketSales", () => {
  it("keeps valid product ids with parseable dates, drops the rest", () => {
    const end = new Date(Date.now() + 3600000).toISOString()
    expect(parseMarketSales({ [ID]: end, nope: end, [ID.slice(0, 8)]: end })).toEqual({ [ID]: end })
    expect(parseMarketSales({ [ID]: "soon" })).toEqual({})
    expect(parseMarketSales({ [ID]: "" })).toEqual({})
    expect(parseMarketSales(null)).toEqual({})
    expect(parseMarketSales([])).toEqual({})
  })
})

describe("saleSecondsLeft", () => {
  it("counts down to the product end, 0 when missing/ended", () => {
    const now = Date.now()
    const end = new Date(now + 60000).toISOString()
    expect(saleSecondsLeft({ [ID]: end }, ID, now)).toBeGreaterThan(50)
    expect(saleSecondsLeft({}, ID, now)).toBe(0)
    expect(saleSecondsLeft(null, ID, now)).toBe(0)
    expect(saleSecondsLeft({ [ID]: new Date(now - 1000).toISOString() }, ID, now)).toBe(0)
  })
})
