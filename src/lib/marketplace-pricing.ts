"use client"

// TechPivo Market — multi-currency pricing (gateway charges NGN; CJ costs USD)
// Rate source: /api/tools/fx (live) with 6h localStorage cache, static fallback.

import { useEffect, useState } from "react"
import { fxFormat } from "@/lib/fx-shared"

const RATE_KEY_PREFIX = "tp_market_fx_v1"
const FALLBACK_USD_NGN = 1600

export const MARKET_CURRENCY_KEY = "tp_market_currency_v1"
export type MarketCurrency = "USD" | "NGN" | "EUR" | "GBP" | "GHS" | "KES" | "ZAR" | "CAD" | "AUD" | "INR" | "JPY" | "AED"

export const MARKET_CURRENCIES: MarketCurrency[] = [
  "USD", "NGN", "EUR", "GBP", "GHS", "KES", "ZAR", "CAD", "AUD", "INR", "JPY", "AED",
]

/** Map ISO country code → default display currency for geo-location. */
export const COUNTRY_TO_CURRENCY: Record<string, MarketCurrency> = {
  NG: "NGN", US: "USD", GB: "GBP", EUR: "EUR", DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR",
  GH: "GHS", KE: "KES", ZA: "ZAR", CA: "CAD", AU: "AUD", IN: "INR", JP: "JPY", AE: "AED", SA: "AED",
}

/** Resolve the best default currency from a detected country code. */
export function currencyForCountry(countryCode: string | null | undefined): MarketCurrency {
  if (!countryCode) return "USD"
  const mapped = COUNTRY_TO_CURRENCY[countryCode.toUpperCase()]
  return mapped ?? "USD"
}

export function readMarketCurrency(): MarketCurrency {
  if (typeof window === "undefined") return "USD"
  try {
    const v = window.localStorage.getItem(MARKET_CURRENCY_KEY)
    if (v && MARKET_CURRENCIES.includes(v as MarketCurrency)) return v as MarketCurrency
  } catch {
    // ignore
  }
  return "USD"
}

export function setMarketCurrency(code: MarketCurrency): void {
  try {
    window.localStorage.setItem(MARKET_CURRENCY_KEY, code)
  } catch {
    // storage blocked
  }
  window.dispatchEvent(new Event("tp-market-currency"))
}

export function useMarketCurrency(): MarketCurrency {
  const [cur, setCur] = useState<MarketCurrency>("USD")
  useEffect(() => {
    setCur(readMarketCurrency())
    const sync = () => setCur(readMarketCurrency())
    window.addEventListener("tp-market-currency", sync)
    window.addEventListener("storage", sync)
    window.addEventListener("focus", sync)
    return () => {
      window.removeEventListener("tp-market-currency", sync)
      window.removeEventListener("storage", sync)
      window.removeEventListener("focus", sync)
    }
  }, [])
  return cur
}

interface FxCache {
  rate: number
  at: number
}

function cacheKey(from: string, to: string): string {
  return `${RATE_KEY_PREFIX}:${from}:${to}`
}

function readCache(from: string, to: string): number | null {
  try {
    const raw = window.localStorage.getItem(cacheKey(from, to))
    if (!raw) return null
    const c = JSON.parse(raw) as FxCache
    if (!c || !Number.isFinite(c.rate) || Date.now() - c.at > 6 * 3600 * 1000) return null
    return c.rate
  } catch {
    return null
  }
}

let inflight: Record<string, Promise<{ from: string; to: string; rate: number } | null>> = {}

function sharedRate(from: string, to: string): Promise<{ from: string; to: string; rate: number } | null> {
  const key = `${from}:${to}`
  if (!inflight[key]) {
    inflight[key] = fetch(`/api/tools/fx?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=1`)
      .then((r) => r.json())
      .then((j) => {
        const v = Number(j?.rate)
        if (!Number.isFinite(v) || v <= 0) return null
        try {
          window.localStorage.setItem(cacheKey(from, to), JSON.stringify({ rate: v, at: Date.now() } satisfies FxCache))
        } catch {
          // ignore
        }
        return { from, to, rate: v }
      })
      .catch(() => null)
      .finally(() => {
        delete inflight[key]
      })
  }
  return inflight[key].then((r) => (r && r.from === from && r.to === to ? r : null))
}

/** Live conversion rate for any supported pair (cached 6h, fallback static). */
export function useFxRate(to: MarketCurrency): number {
  const from = "USD"
  const [rate, setRate] = useState<number>(() => {
    if (typeof window === "undefined") return to === "USD" ? 1 : FALLBACK_USD_NGN
    if (to === "USD") return 1
    return readCache(from, to) ?? (to === "NGN" ? FALLBACK_USD_NGN : 1)
  })
  useEffect(() => {
    if (to === "USD") {
      setRate(1)
      return
    }
    let live = true
    sharedRate(from, to).then((v) => {
      if (live && v !== null) setRate(v.rate)
    })
    return () => {
      live = false
    }
  }, [to])
  return rate
}

/** Single-currency display honoring the header switch: "$4.92" / "₦7,872" / "€4.50" … */
export function formatMarketPrice(usd: number | null | undefined, rate: number, currency: MarketCurrency): string {
  const u = Number(usd ?? 0)
  if (!Number.isFinite(u) || u <= 0) return "—"
  if (currency === "USD") return fxFormat(u, "USD")
  return fxFormat(Math.round(u * rate * 100) / 100, currency, { maxFrac: currency === "JPY" ? 0 : 2 })
}

/** Dual display: "$4.92 · ₦7,872". NGN has no kobo (gateway minimums are whole kobo anyway). */
export function dualPrice(usd: number | null | undefined, rate: number): string {
  const u = Number(usd ?? 0)
  if (!Number.isFinite(u) || u <= 0) return "—"
  return `${fxFormat(u, "USD")} · ${fxFormat(Math.round(u * rate * 100) / 100, "NGN", { maxFrac: 0 })}`
}

/** Whole-naira amount for a USD value (gateway charges kobo = naira * 100). */
export function usdToNgn(usd: number, rate: number): number {
  return Math.max(1, Math.round(Number(usd || 0) * rate))
}
