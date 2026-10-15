"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { parseMarketMerch, parseMarketMerchGlobal, showSaleBadge, type MarketMerch } from "@/lib/marketplace-merch"

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
  if (cached) return Promise.resolve(cached)
  if (inflight) return inflight
  inflight = fetch("/api/marketplace/merch", { cache: "no-store" })
    .then((r) => r.json())
    .then((d) => {
      cached = { merch: parseMarketMerch(d?.merch), saleBadges: d?.sale_badges !== false }
      return cached
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
    if (seeded) {
      setState(seeded)
      return
    }
    let alive = true
    getMarketMerch().then((m) => {
      if (alive) setState(m)
    })
    return () => {
      alive = false
    }
  }, [seeded])
  return state
}

/** Effective discount display for one product (global switch + per-product flag). */
export function useSaleBadge(productId: string): boolean {
  const { merch, saleBadges } = useMarketMerch()
  return showSaleBadge(saleBadges, merch, productId)
}

// Re-exported so card components only import from here.
export { parseMarketMerchGlobal, showSaleBadge }
export type { MarketMerch }
