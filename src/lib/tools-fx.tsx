"use client"

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react"
import { FX_CURRENCY_LABELS, FX_POPULAR } from "@/lib/fx-shared"
import { useFx } from "@/lib/use-fx"
import { getGeoOnce } from "@/lib/tools-geo"
import { s } from "@/lib/tools-ui"
import { COUNTRY_TO_CURRENCY } from "@/lib/geo"

export function CurrencySelect({ value, onChange, style }: { value: string; onChange: (code: string) => void; style?: CSSProperties }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...s.sel, ...style }}>
      {FX_POPULAR.map((code) => (
        <option key={code} value={code}>{code} — {FX_CURRENCY_LABELS[code]}</option>
      ))}
    </select>
  )
}

// Live-FX + visitor-geo hook for tools: picks the visitor's country currency by default,
// falls back to USD, and exposes live rates (fallback: stored rates when offline).
export function useToolFx() {
  const fx = useFx()
  const [currency, setCurrency] = useState<string>("USD")
  const [detected, setDetected] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getGeoOnce().then((geo) => {
      if (!active) return
      const cc = geo?.countryCode ? COUNTRY_TO_CURRENCY[geo.countryCode] || geo.currency : null
      if (cc) {
        setDetected(cc)
        setCurrency(cc)
      } else {
        setDetected(null)
        setCurrency("USD")
      }
    })
    return () => { active = false }
  }, [])

  const format = useCallback(
    (amount: number, opts?: { maxFrac?: number }) => fx.format(amount, currency, currency, opts),
    [fx, currency],
  )

  const convertFrom = useCallback(
    (amount: number, from: string) => fx.convert(amount, from, currency),
    [fx, currency],
  )

  return useMemo(() => ({
    currency, setCurrency, detected, format, convertFrom, convert: fx.convert,
    rates: fx.rates, loading: fx.loading,
  }), [currency, detected, format, convertFrom, fx])
}