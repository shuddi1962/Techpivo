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
