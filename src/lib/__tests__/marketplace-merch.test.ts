import { describe, expect, it } from "vitest"
import { isBestsellerPick, isNewPick, parseMarketMerch, parseMarketMerchGlobal, saleBadgeOn, showSaleBadge } from "@/lib/marketplace-merch"

const ID = "123e4567-e89b-12d3-a456-426614174000"

describe("parseMarketMerch", () => {
  it("keeps valid product flags, drops junk", () => {
    expect(parseMarketMerch({ [ID]: { sale: false, is_new: true }, nope: { sale: false } })).toEqual({
      [ID]: { sale: false, is_new: true },
    })
    expect(parseMarketMerch({ [ID]: { sale: "yes" } })).toEqual({ [ID]: {} })
    expect(parseMarketMerch(null)).toEqual({})
    expect(parseMarketMerch([])).toEqual({})
  })
})

describe("merch helpers", () => {
  it("sale badges default ON, pins default OFF", () => {
    expect(saleBadgeOn(undefined, ID)).toBe(true)
    expect(saleBadgeOn({}, ID)).toBe(true)
    expect(saleBadgeOn({ [ID]: { sale: false } }, ID)).toBe(false)
    expect(isNewPick({ [ID]: { is_new: true } }, ID)).toBe(true)
    expect(isNewPick({}, ID)).toBe(false)
    expect(isBestsellerPick({ [ID]: { bestseller: true } }, ID)).toBe(true)
    expect(isBestsellerPick({}, ID)).toBe(false)
  })

  it("global switch defaults ON and gates every badge", () => {
    expect(parseMarketMerchGlobal(null)).toBe(true)
    expect(parseMarketMerchGlobal({})).toBe(true)
    expect(parseMarketMerchGlobal({ _global: { sale_badges: false } })).toBe(false)
    expect(parseMarketMerchGlobal({ _global: { sale_badges: true } })).toBe(true)
    // The reserved key never leaks into per-product flags.
    expect(parseMarketMerch({ _global: { sale_badges: false }, [ID]: { sale: false } })).toEqual({
      [ID]: { sale: false },
    })
    // Effective display = global AND per-product.
    expect(showSaleBadge(true, {}, ID)).toBe(true)
    expect(showSaleBadge(false, {}, ID)).toBe(false)
    expect(showSaleBadge(true, { [ID]: { sale: false } }, ID)).toBe(false)
    expect(showSaleBadge(undefined, {}, ID)).toBe(true)
  })
})
