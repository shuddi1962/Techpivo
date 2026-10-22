import { describe, expect, it } from "vitest"
import {
  matchCjFirstLevel,
  matchCjSecondLevel,
  pickDefaultVariant,
  parseCjPrice,
  type CjCategoryIndex,
  type CjCategoryRow,
} from "@/lib/cj"

// A miniature version of CJ's category tree — the shape our own taxonomy
// was modelled on.
const rows: CjCategoryRow[] = [
  {
    firstId: "F1",
    firstName: "Consumer Electronics",
    secondId: "S1",
    secondName: "Camera & Photo",
    thirdId: "T1",
    thirdName: "Camera Tripods",
  },
  {
    firstId: "F1",
    firstName: "Consumer Electronics",
    secondId: "S2",
    secondName: "Video Games",
    thirdId: "T2",
    thirdName: "Game Controllers",
  },
  {
    firstId: "F2",
    firstName: "Computer & Office",
    secondId: "S3",
    secondName: "Laptop & Tablets",
    thirdId: "T3",
    thirdName: "Laptops",
  },
]

function index(): CjCategoryIndex {
  const byFirst = new Map<string, CjCategoryRow[]>()
  const bySecond = new Map<string, CjCategoryRow[]>()
  const byThird = new Map<string, CjCategoryRow[]>()
  for (const r of rows) {
    byFirst.set(r.firstName.toLowerCase(), [r])
    bySecond.set(r.secondName.toLowerCase(), [r])
    byThird.set(r.thirdName.toLowerCase(), [r])
  }
  return { rows, byFirst, bySecond, byThird }
}

describe("CJ category mapping", () => {
  it("matches a department by name", () => {
    const hit = matchCjFirstLevel(index(), "Consumer Electronics")
    expect(hit.length).toBe(1)
    expect(hit[0].firstName).toBe("Consumer Electronics")
  })

  it("matches a subcategory inside its department", () => {
    const hit = matchCjSecondLevel(index(), "Camera & Photo", "Consumer Electronics")
    expect(hit.length).toBe(1)
    expect(hit[0].secondId).toBe("S1")
  })

  it("tolerates a plural mismatch (our 'Laptops & Tablets' vs CJ's 'Laptop & Tablets')", () => {
    const hit = matchCjSecondLevel(index(), "Laptops & Tablets", "Computer & Office")
    expect(hit.length).toBe(1)
    expect(hit[0].secondName).toBe("Laptop & Tablets")
  })

  it("never matches a subcategory from another department", () => {
    const hit = matchCjSecondLevel(index(), "Camera & Photo", "Computer & Office")
    expect(hit.length).toBe(0)
  })

  it("returns nothing for an unknown category", () => {
    expect(matchCjFirstLevel(index(), "Pet Supplies").length).toBe(0)
  })
})

describe("CJ variant helpers", () => {
  it("picks the cheapest usable variant", () => {
    const vid = pickDefaultVariant([
      { vid: "a", variantSellPrice: 9 },
      { vid: "b", variantSellPrice: 3 },
      { vid: "c", variantSellPrice: 5 },
    ])
    expect(vid).toBe("b")
  })

  it("ignores variants without an id", () => {
    const vid = pickDefaultVariant([{ variantSellPrice: 1 }, { vid: "z", variantSellPrice: 4 }])
    expect(vid).toBe("z")
  })

  it("returns null when there is no variant at all", () => {
    expect(pickDefaultVariant([])).toBeNull()
  })
})

describe("CJ price parsing", () => {
  it("reads a plain price", () => {
    expect(parseCjPrice("2.34")).toBe(2.34)
  })

  it("reads the first price of a range ('2.34 -- 2.70')", () => {
    expect(parseCjPrice("2.34 -- 2.70")).toBe(2.34)
  })

  it("never returns NaN", () => {
    expect(parseCjPrice("")).toBe(0)
    expect(parseCjPrice(null)).toBe(0)
    expect(Number.isNaN(parseCjPrice(undefined))).toBe(false)
  })
})
