import "server-only"
import { FX_FALLBACK_NGN } from "@/lib/fx-shared"

const FX_API = "https://open.er-api.com/v6/latest/USD"
const FX_FALLBACK_API = "https://api.frankfurter.app/latest?from=USD"

let liveCache: { t: number; perNgn: Record<string, number> } | null = null

async function fetchExternal(url: string, timeoutMs = 8000): Promise<any> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal, next: { revalidate: 3600 } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

function toPerNgn(usdRates: Record<string, number>): Record<string, number> {
  const ngnUsd = Number(usdRates["NGN"]) || 0
  if (!ngnUsd) throw new Error("NGN rate missing")
  const out: Record<string, number> = { NGN: 1 }
  for (const [code, rate] of Object.entries(usdRates)) {
    const r = Number(rate)
    if (code === "NGN" || !r || r <= 0) continue
    out[code] = ngnUsd / r
  }
  return out
}

// Live USD-based rates from open.er-api.com, frankfurter fallback, static fallback last.
// Cached in-memory for 6h to stay well within free-tier limits.
export async function getFxRatesPerNgn(): Promise<{ rates: Record<string, number>; updatedAt: string; source: "live" | "fallback" }> {
  if (liveCache && Date.now() - liveCache.t < 6 * 60 * 60 * 1000) {
    return { rates: liveCache.perNgn, updatedAt: new Date(liveCache.t).toISOString(), source: "live" }
  }
  try {
    const data = await fetchExternal(FX_API)
    if (data?.result === "success" && data.rates) {
      const perNgn = toPerNgn(data.rates)
      liveCache = { t: Date.now(), perNgn }
      return { rates: perNgn, updatedAt: new Date(data.time_last_update_unix * 1000 || Date.now()).toISOString(), source: "live" }
    }
    throw new Error("bad payload")
  } catch {
    try {
      const data = await fetchExternal(FX_FALLBACK_API)
      if (data?.rates) {
        const perNgn = toPerNgn(data.rates)
        liveCache = { t: Date.now(), perNgn }
        return { rates: perNgn, updatedAt: new Date(data.date || Date.now()).toISOString(), source: "live" }
      }
    } catch {
      /* both providers down — static fallback */
    }
    return { rates: FX_FALLBACK_NGN, updatedAt: "", source: "fallback" }
  }
}

export async function getFxRate(from: string, to: string): Promise<{ rate: number; updatedAt: string; source: "live" | "fallback" }> {
  const { rates, updatedAt, source } = await getFxRatesPerNgn()
  const a = Number(rates[from]) || 1
  const b = Number(rates[to]) || Number(rates[from]) || 1
  return { rate: a / b, updatedAt, source }
}