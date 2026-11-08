"use client"

import { useEffect, useState } from "react"
import {
  fxStore,
  notify,
  refreshFxRate,
  subscribeToFxRate,
} from "@/lib/fx-shared"

export function useLiveNgnRate(): number {
  const [rate, setRate] = useState<number>(fxStore.ngnRate)
  useEffect(() => {
    setRate(fxStore.ngnRate)
    const unsub = subscribeToFxRate(() => setRate(fxStore.ngnRate))
    // Refresh on mount and on focus
    void refreshFxRate()
    const onFocus = () => void refreshFxRate()
    window.addEventListener("focus", onFocus)
    return () => {
      unsub()
      window.removeEventListener("focus", onFocus)
    }
  }, [])
  return rate
}

export function useLiveUsdRate(): number {
  const [rate, setRate] = useState<number>(fxStore.usdRate)
  useEffect(() => {
    setRate(fxStore.usdRate)
    const unsub = subscribeToFxRate(() => setRate(fxStore.usdRate))
    return () => unsub()
  }, [])
  return rate
}
