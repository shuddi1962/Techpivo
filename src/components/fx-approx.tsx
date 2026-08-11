"use client"

import { useFx } from "@/lib/use-fx"
import { fxFormat } from "@/lib/fx-shared"

// Renders "≈ $750.00" in the user's preferred currency using live FX rates.
// Returns null when from === target (nothing to convert).
export function FxApprox({ amount, from, to, className }: { amount: number; from: string; to?: string; className?: string }) {
  const fx = useFx()
  const target = to || fx.displayCurrency
  if (from.toUpperCase() === target.toUpperCase()) return null
  const value = fx.convert(amount, from, target)
  if (!isFinite(value)) return null
  return <span className={className}>≈ {fxFormat(value, target, { maxFrac: value > 1000 ? 0 : 2 })}</span>
}