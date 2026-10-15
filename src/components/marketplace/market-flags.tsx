"use client"

import { useEffect, useState } from "react"
import { parseMarketMerch, type MarketMerch } from "@/lib/marketplace-merch"

// Shared cached merch flags — one request per page load no matter how many
// cards ask. "" map = defaults (sale badges on, no pins).
let cached: MarketMerch | null = null
let inflight: Promise<MarketMerch> | null = null

export function getMarketMerch(): Promise<MarketMerch> {
  if (cached) return Promise.resolve(cached)
  if (inflight) return inflight
  inflight = fetch("/api/marketplace/merch")
    .then((r) => r.json())
    .then((d) => {
      cached = parseMarketMerch(d?.merch)
      return cached
    })
    .catch(() => {
      cached = {}
      return cached
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function useMarketMerch(): MarketMerch {
  const [merch, setMerch] = useState<MarketMerch>({})
  useEffect(() => {
    let alive = true
    getMarketMerch().then((m) => {
      if (alive) setMerch(m)
    })
    return () => {
      alive = false
    }
  }, [])
  return merch
}
