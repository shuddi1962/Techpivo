"use client"

import { useEffect, useState } from "react"
import { Timer } from "lucide-react"
import { flashSecondsLeft } from "@/lib/marketplace-banners"
import { getMarketSales } from "@/lib/marketplace-sales"

// Live urgency timer ("Ends in 04:12:33" / "Ends in 2d 04:12") like the big
// stores show under a deal. Renders nothing when the end date is missing
// or has passed. Wall-clock re-resolved every second so throttled tabs
// snap back to the true remaining time.
export function SaleCountdown({
  endAt,
  prefix = "Ends in",
  className = "",
}: {
  endAt: string
  prefix?: string
  className?: string
}) {
  const [left, setLeft] = useState(() => flashSecondsLeft(endAt))
  useEffect(() => {
    setLeft(flashSecondsLeft(endAt))
    const t = setInterval(() => setLeft(flashSecondsLeft(endAt)), 1000)
    return () => clearInterval(t)
  }, [endAt])
  if (left <= 0) return null
  const d = Math.floor(left / 86400)
  const p = (n: number) => String(n).padStart(2, "0")
  const h = p(Math.floor((left % 86400) / 3600))
  const m = p(Math.floor((left % 3600) / 60))
  const s = p(left % 60)
  const text = d > 0 ? `${d}d ${h}:${m}:${s}` : `${h}:${m}:${s}`
  return (
    <span
      role="timer"
      aria-label={`${prefix} ${text}`}
      className={`inline-flex items-center gap-1 rounded-full bg-[#0F172A] px-2 py-0.5 text-[10px] font-bold tabular-nums text-white ${className}`}
    >
      <Timer className="h-3 w-3 text-[#F59E0B]" />
      {prefix} {text}
    </span>
  )
}

// Per-product sale end (Admin → Marketplace → Products → "Sale ends").
// Shared cached fetch — hundreds of cards cost one request. "" = no timer.
export function useSaleEnd(productId: string): string {
  const [end, setEnd] = useState("")
  useEffect(() => {
    let alive = true
    getMarketSales().then((m) => {
      if (alive) setEnd(m[productId] || "")
    })
    return () => {
      alive = false
    }
  }, [productId])
  return end
}
