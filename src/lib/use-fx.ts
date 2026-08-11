"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { FX_FALLBACK_NGN } from "@/lib/fx-shared"
import { getGeoOnce } from "@/lib/tools-geo"
import { COUNTRY_TO_CURRENCY } from "@/lib/geo"

export interface FxRates {
  rates: Record<string, number>
  updatedAt: string
  source: "live" | "fallback"
}

export const FX_CACHE_KEY = "tp_fx_rates"
export const FX_PREF_KEY = "tp_display_currency"
const FX_CACHE_TTL_MS = 6 * 60 * 60 * 1000

let inFlight: Promise<FxRates> | null = null

export function getFxRates(force = false): Promise<FxRates> {
  try {
    if (!force) {
      const cached = localStorage.getItem(FX_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached) as { t: number; data: FxRates }
        if (Date.now() - parsed.t < FX_CACHE_TTL_MS) return Promise.resolve(parsed.data)
      }
    }
  } catch { /* storage unavailable */ }
  if (inFlight) return inFlight
  const p = (async () => {
    try {
      const res = await fetch("/api/tools/fx", { cache: "no-store" })
      const data = (await res.json()) as { rates?: Record<string, number>; updatedAt?: string; source?: string } | null
      const result: FxRates = {
        rates: data?.rates || FX_FALLBACK_NGN,
        updatedAt: data?.updatedAt || "",
        source: data?.source === "live" || data?.source === "fallback" ? data.source : "fallback",
      }
      try { localStorage.setItem(FX_CACHE_KEY, JSON.stringify({ t: Date.now(), data: result })) } catch { /* ignore */ }
      return result
    } catch {
      return { rates: FX_FALLBACK_NGN, updatedAt: "", source: "fallback" } as FxRates
    }
  })()
  inFlight = p
  void p.finally(() => { inFlight = null })
  return p
}

// Convert amount from any currency to any other; rates are NGN-based (units per 1 NGN)
export function convertFx(rates: Record<string, number>, amount: number, from: string, to: string): number {
  const perNgnFrom = Number(rates[from]) || 1
  const perNgnTo = Number(rates[to]) || perNgnFrom
  return (amount * perNgnFrom) / perNgnTo
}

export function useFx() {
  const [rates, setRates] = useState<FxRates>({ rates: FX_FALLBACK_NGN, updatedAt: "", source: "fallback" })
  const [displayCurrency, setDisplayCurrency] = useState<string>("NGN")
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    let pref: string | null = null
    try { pref = localStorage.getItem(FX_PREF_KEY) } catch { /* ignore */ }
    if (mounted.current && pref) setDisplayCurrency(pref)
    if (!pref) {
      // No preference yet — auto-detect the visitor's country currency (worldwide default)
      getGeoOnce().then((geo) => {
        if (!mounted.current) return
        try { if (localStorage.getItem(FX_PREF_KEY)) return } catch { /* ignore */ }
        const cc = geo?.countryCode ? COUNTRY_TO_CURRENCY[geo.countryCode] || geo.currency || null : null
        if (cc) setDisplayCurrency(cc)
      })
    }
    getFxRates().then((r) => {
      if (mounted.current) { setRates(r); setLoading(false) }
    })
    return () => { mounted.current = false }
  }, [])

  const convert = useCallback((amount: number, from: string, to?: string) =>
    convertFx(rates.rates, amount, from, to || displayCurrency), [rates, displayCurrency])

  const format = useCallback((amount: number, from: string, to?: string, opts?: { maxFrac?: number }) => {
    const target = to || displayCurrency
    const value = convertFx(rates.rates, amount, from, target)
    const symbols: Record<string, string> = { NGN: "₦", USD: "$", EUR: "€", GBP: "£", GHS: "GH₵", KES: "KSh", ZAR: "R", CAD: "C$", AUD: "A$", INR: "₹", JPY: "¥", CNY: "¥", SGD: "S$" }
    const frac = opts?.maxFrac ?? (target === "NGN" ? 0 : 2)
    return `${symbols[target] || target + " "}${value.toLocaleString(undefined, { maximumFractionDigits: frac })}`
  }, [rates, displayCurrency])

  const setPreference = useCallback((code: string) => {
    setDisplayCurrency(code)
    try { localStorage.setItem(FX_PREF_KEY, code) } catch { /* ignore */ }
  }, [])

  return { rates, displayCurrency, setDisplayCurrency: setPreference, convert, format, loading }
}