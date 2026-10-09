import { describe, expect, it, beforeEach, vi } from "vitest"

// Regression test for "Minified React error #185 / Maximum update depth
// exceeded" on storefront pages: useSyncExternalStore re-renders while the
// snapshot identity keeps changing, so getCart() must return a REFERENTIALLY
// STABLE array while the underlying storage is unchanged.

function installWindow(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial))
  const listeners: Record<string, Array<() => void>> = {}
  const fakeWindow = {
    localStorage: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => {
        store.set(k, String(v))
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
    },
    addEventListener: (t: string, fn: () => void) => {
      listeners[t] = [...(listeners[t] || []), fn]
    },
    dispatchEvent: () => true,
  }
  vi.stubGlobal("window", fakeWindow)
  return { store, listeners }
}

describe("marketplace-cart snapshot stability", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it("returns the identical array reference while storage is unchanged", async () => {
    installWindow({ tp_market_cart_v1: JSON.stringify([{ id: "a", qty: 2 }]) })
    const { getCart } = await import("@/lib/marketplace-cart")
    const first = getCart()
    const second = getCart()
    expect(second).toBe(first)
    expect(first).toEqual([{ id: "a", qty: 2, variant: null }])
  })

  it("returns a new reference once after mutation, then stays stable", async () => {
    installWindow()
    const { getCart, addToCart } = await import("@/lib/marketplace-cart")
    const before = getCart()
    expect(before).toEqual([])
    addToCart("p1", 3)
    const after = getCart()
    expect(after).toEqual([{ id: "p1", qty: 3, variant: null }])
    expect(after).not.toBe(before)
    // Repeated reads without writes must be referentially stable —
    // this is what stops the infinite re-render loop.
    expect(getCart()).toBe(after)
    expect(getCart()).toBe(after)
  })

  it("clamps quantities and drops invalid lines", async () => {
    installWindow({
      tp_market_cart_v1: JSON.stringify([
        { id: "ok", qty: 200 },
        { id: 123, qty: 1 },
        null,
      ]),
    })
    const { getCart, cartCount } = await import("@/lib/marketplace-cart")
    expect(getCart()).toEqual([{ id: "ok", qty: 99, variant: null }])
    expect(cartCount(getCart())).toBe(99)
  })
})

describe("marketplace-cart line merging", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it("repeated adds of the same product grow one line instead of forking", async () => {
    installWindow()
    const { getCart, addToCart } = await import("@/lib/marketplace-cart")
    addToCart("p1", 1)
    addToCart("p1", 1)
    addToCart("p1", 2)
    expect(getCart()).toEqual([{ id: "p1", qty: 4, variant: null }])
  })

  it("same variant merges; different variants stay separate lines", async () => {
    installWindow()
    const { getCart, addToCart } = await import("@/lib/marketplace-cart")
    const black = { vid: "v-black", label: "Black" }
    const white = { vid: "v-white", label: "White" }
    addToCart("p1", 1, black)
    addToCart("p1", 2, { vid: "v-black", label: "Black" })
    addToCart("p1", 1, white)
    expect(getCart()).toEqual([
      { id: "p1", qty: 3, variant: { vid: "v-black", label: "Black", image: null } },
      { id: "p1", qty: 1, variant: { vid: "v-white", label: "White", image: null } },
    ])
  })

  it("empty-vid variants normalize to option-less so they merge", async () => {
    installWindow()
    const { getCart, addToCart } = await import("@/lib/marketplace-cart")
    addToCart("p1", 1, { vid: "", label: "" })
    addToCart("p1", 1)
    expect(getCart()).toEqual([{ id: "p1", qty: 2, variant: null }])
  })

  it("variant images survive storage round-trips for bag thumbnails", async () => {
    installWindow()
    const { getCart, addToCart } = await import("@/lib/marketplace-cart")
    addToCart("p1", 1, { vid: "v1", label: "Black", image: "https://img/x.jpg" })
    expect(getCart()[0].variant).toEqual({ vid: "v1", label: "Black", image: "https://img/x.jpg" })
  })

  it("setQty/remove target the exact variant line", async () => {
    installWindow()
    const { getCart, addToCart, setQty, removeFromCart } = await import("@/lib/marketplace-cart")
    addToCart("p1", 1, { vid: "v-black", label: "Black" })
    addToCart("p1", 1, { vid: "v-white", label: "White" })
    setQty("p1", 5, { vid: "v-black", label: "Black" })
    expect(getCart().find((l) => l.variant?.vid === "v-black")?.qty).toBe(5)
    removeFromCart("p1", { vid: "v-white", label: "White" })
    expect(getCart()).toEqual([
      { id: "p1", qty: 5, variant: { vid: "v-black", label: "Black", image: null } },
    ])
  })
})
