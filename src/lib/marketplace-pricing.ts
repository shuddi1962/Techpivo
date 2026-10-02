"use client"

// TechPivo Market — dual USD/NGN pricing (Paystack charges NGN; CJ costs USD)
// Rate source: /api/tools/fx (live) with 6h localStorage cache, 1600 fallback.

import { useEffect, useState } from "react"
import { fxFormat } from "@/lib/fx-shared"

const RATE_KEY = "tp_market_fx_v1"
const FALLBACK_USD_NGN = 1600

interface FxCache {
  rate: number
  at: number
}

function readCache(): number | null {
  try {
    const raw = window.localStorage.getItem(RATE_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as FxCache
    if (!c || !Number.isFinite(c.rate) || Date.now() - c.at > 6 * 3600 * 1000) return null
    return c.rate
  } catch {
    return null
  }
}

/** Live USD→NGN rate (cached 6h, fallback 1600). */
export function useUsdNgnRate(): number {
  const [rate, setRate] = useState<number>(() => {
    if (typeof window === "undefined") return FALLBACK_USD_NGN
    return readCache() ?? FALLBACK_USD_NGN
  })
  useEffect(() => {
    let live = true
    fetch("/api/tools/fx?from=USD&to=NGN&amount=1")
      .then((r) => r.json())
      .then((j) => {
        const v = Number(j?.rate)
        if (live && Number.isFinite(v) && v > 0) {
          setRate(v)
          try {
            window.localStorage.setItem(RATE_KEY, JSON.stringify({ rate: v, at: Date.now() } satisfies FxCache))
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {
        // keep fallback
      })
    return () => {
      live = false
    }
  }, [])
  return rate
}

/** Dual display: "$4.92 · ₦7,872". NGN has no kobo (Paystack minimums are whole kobo anyway). */
export function dualPrice(usd: number | null | undefined, rate: number): string {
  const u = Number(usd ?? 0)
  if (!Number.isFinite(u) || u <= 0) return "—"
  return `${fxFormat(u, "USD")} · ${fxFormat(Math.round(u * rate), "NGN", { maxFrac: 0 })}`
}

/** NGN whole-naira amount for a USD value (Paystack charges kobo = naira * 100). */
export function usdToNgn(usd: number, rate: number): number {
  return Math.max(1, Math.round(Number(usd || 0) * rate))
}
