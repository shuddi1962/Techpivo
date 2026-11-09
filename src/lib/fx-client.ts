"use client"

import { useEffect, useState } from "react"
import {
  fxStore,
  notify,
  refreshFxRate,
  subscribeToFxRate,
  getLiveRate,
} from "@/lib/fx-shared"

export function useLiveNgnRate(): number {
  return useLiveFxRate("NGN")
}

export function useLiveUsdRate(): number {
  return 1
}

/** Live conversion rate for any supported pair (USD base). USD base: rates[code] = units of `code` per 1 USD. */
export function useLiveFxRate(to: string): number {
  const [rate, setRate] = useState<number>(() => getLiveRate(to))
  useEffect(() => {
    setRate(getLiveRate(to))
    const unsub = subscribeToFxRate(() => setRate(getLiveRate(to)))
    // Refresh on mount and on focus
    void refreshFxRate()
    const onFocus = () => void refreshFxRate()
    window.addEventListener("focus", onFocus)
    return () => {
      unsub()
      window.removeEventListener("focus", onFocus)
    }
  }, [to])
  return rate
}

export { getLiveRate, fxStore, notify, refreshFxRate }
