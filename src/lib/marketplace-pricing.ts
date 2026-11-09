"use client"

// TechPivo Market — multi-currency pricing.
//
// Currency architecture (USD is the GLOBAL BASE currency):
//
//   1. Base currency   = USD.  Product prices are stored and maintained in USD.
//   2. Display currency= what the shopper browses in (USD, NGN, GBP, EUR, …).
//      Prices are converted USD → display currency purely for DISPLAY.
//      The original USD price is never overwritten.
//   3. Checkout currency = USD.  The cart/checkout total is always USD.
//   4. Payment transaction currency = USD (Flutterwave charges USD).
//   5. Settlement currency = whatever the merchant's Flutterwave account settles in.
//
// Display currency selection never changes the underlying cart/order amount
// and never triggers a double conversion. Rates are fetched once (USD base)
// and shared across every display surface via the shared FX store.

import { useEffect, useState } from "react"
import { fxFormat, getLiveRate, getLiveNgnRate, subscribeToFxRate, usdToNgn } from "@/lib/fx-shared"

const MARKET_CURRENCY_KEY = "tp_market_currency_v1"
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

/** Live conversion rate USD → `to` (USD base). Shared across the whole app
 *  so every surface shows identical converted prices — no double conversion. */
export function useFxRate(to: MarketCurrency): number {
  const [rate, setRate] = useState<number>(() => getLiveRate(to))
  useEffect(() => {
    setRate(getLiveRate(to))
    const unsub = (() => {
      let called = false
      return () => {
        if (called) return
        called = true
      }
    })()
    // The shared store refreshes all rates on mount/focus; subscribe keeps
    // this component in sync without issuing its own per-currency fetch.
    const unsubSub = subscribeToFxRate(() => setRate(getLiveRate(to)))
    const onFocus = () => setRate(getLiveRate(to))
    window.addEventListener("focus", onFocus)
    return () => {
      unsubSub()
      window.removeEventListener("focus", onFocus)
    }
  }, [to])
  return rate
}

/** Back-compat: live NGN-per-USD rate (USD base). */
export function useLiveNgnRate(): number {
  return useFxRate("NGN")
}

/** Single-currency display honoring the header switch: "$4.92" / "₦7,872" / "€4.50" … */
export function formatMarketPrice(usd: number | null | undefined, rate: number, currency: MarketCurrency): string {
  const u = Number(usd ?? 0)
  if (!Number.isFinite(u) || u <= 0) return "—"
  if (currency === "USD") return fxFormat(u, "USD")
  const converted = Math.round(u * rate * 100) / 100
  return fxFormat(converted, currency, { maxFrac: currency === "JPY" ? 0 : 2 })
}

/** Dual display: "$4.92 · ₦7,872". NGN has no kobo. */
export function dualPrice(usd: number | null | undefined, rate: number): string {
  const u = Number(usd ?? 0)
  if (!Number.isFinite(u) || u <= 0) return "—"
  return `${fxFormat(u, "USD")} · ${fxFormat(Math.round(u * rate * 100) / 100, "NGN", { maxFrac: 0 })}`
}

/** Whole-naira amount for a USD value (gateway charges kobo = naira * 100). */
export function usdToNgnAmount(usd: number): number {
  return usdToNgn(usd)
}

export { getLiveNgnRate, getLiveRate, usdToNgn }
