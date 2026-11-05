"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  parseMarketMerch,
  parseMarketMerchGlobal,
  showSaleBadge,
  salePctOf,
  computeOldPrice,
  productDiscount,
  type MarketMerch,
  type Discount,
} from "@/lib/marketplace-merch"

export interface MarketMerchState {
  merch: MarketMerch
  /** Store-wide discount-badge switch (default true). */
  saleBadges: boolean
}

const DEFAULT_STATE: MarketMerchState = { merch: {}, saleBadges: true }

// Server pages fetch the flags at render time and seed the tree through
// this context — so the first paint already matches the admin's latest
// change instead of flashing defaults (badges ON) before the live fetch
// resolves. Pages without a server seed fall back to the live fetch below.
const MarketMerchContext = createContext<MarketMerchState | null>(null)

export function MarketMerchProvider({ initial, children }: { initial: MarketMerchState; children: ReactNode }) {
  const [state, setState] = useState<MarketMerchState>(initial)
  // Re-validate live after mount (WISE: seeds can be up to `revalidate` old).
  useEffect(() => {
    let alive = true
    getMarketMerch().then((m) => {
      if (alive) setState(m)
    })
    return () => {
      alive = false
    }
  }, [])
  return <MarketMerchContext.Provider value={state}>{children}</MarketMerchContext.Provider>
}

// Shared cached merch flags — one request per page load no matter how many
// cards ask. Defaults = everything on, no pins.
let cached: MarketMerchState | null = null
let inflight: Promise<MarketMerchState> | null = null

export function getMarketMerch(): Promise<MarketMerchState> {
  if (inflight) return inflight
  inflight = fetch("/api/marketplace/merch", { cache: "no-store" })
    .then((r) => r.json())
    .then((d) => {
      const m = { merch: parseMarketMerch(d?.merch), saleBadges: d?.sale_badges !== false }
      cached = m
      return m
    })
    .catch(() => {
      cached = { ...DEFAULT_STATE }
      return cached
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function useMarketMerch(): MarketMerchState {
  const seeded = useContext(MarketMerchContext)
  const [state, setState] = useState<MarketMerchState>(() => seeded || cached || { ...DEFAULT_STATE })
  useEffect(() => {
    let alive = true
    const refresh = () => {
      getMarketMerch().then((m) => {
        if (alive) setState(m)
      })
    }
    // Use the server seed on first mount, then refresh whenever the tab
    // regains focus so admin changes (merch flags, badge switch) show live.
    if (!seeded) refresh()
    window.addEventListener("focus", refresh)
    return () => {
      alive = false
      window.removeEventListener("focus", refresh)
    }
  }, [seeded])
  return state
}

/** Effective discount display for one product (global switch + per-product flag). */
export function useSaleBadge(productId: string): boolean {
  const { merch, saleBadges } = useMarketMerch()
  return showSaleBadge(saleBadges, merch, productId)
}

/** Admin-set discount percentage for a product (0 when none). */
export function useSalePct(productId: string): number {
  const { merch } = useMarketMerch()
  return salePctOf(merch, productId)
}

/** Full discount resolution for a product: { pct, oldPrice }. */
export function useProductDiscount(p: { price: number; oldPrice?: number; sale_pct?: number }, productId: string): Discount {
  const { merch, saleBadges } = useMarketMerch()
  const d = productDiscount(p, merch, productId)
  // If the global switch or per-product flag disables the badge, hide it.
  if (!showSaleBadge(saleBadges, merch, productId)) return { pct: 0, oldPrice: null }
  return d
}

// Re-exported so card components only import from here.
export { parseMarketMerchGlobal, showSaleBadge }
export type { MarketMerch }
