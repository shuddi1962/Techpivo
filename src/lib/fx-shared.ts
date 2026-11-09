export const FX_CURRENCY_LABELS: Record<string, string> = {
  NGN: "Nigerian Naira", USD: "US Dollar", EUR: "Euro", GBP: "British Pound",
  GHS: "Ghanaian Cedi", KES: "Kenyan Shilling", ZAR: "South African Rand",
  CAD: "Canadian Dollar", AUD: "Australian Dollar", INR: "Indian Rupee",
  JPY: "Japanese Yen", CNY: "Chinese Yuan", SGD: "Singapore Dollar", CHF: "Swiss Franc",
  AED: "UAE Dirham", SAR: "Saudi Riyal", EGP: "Egyptian Pound", MAD: "Moroccan Dirham",
  BRL: "Brazilian Real", MXN: "Mexican Peso", TRY: "Turkish Lira", PLN: "Polish Zloty",
}

export const FX_POPULAR: string[] = ["USD", "NGN", "EUR", "GBP", "GHS", "KES", "ZAR", "CAD", "AUD", "INR", "JPY", "AED"]

export const FX_CURRENCY_SYMBOL: Record<string, string> = {
  NGN: "₦", USD: "$", EUR: "€", GBP: "£", GHS: "GH₵", KES: "KSh", ZAR: "R",
  CAD: "C$", AUD: "A$", INR: "₹", JPY: "¥", CNY: "¥", SGD: "S$", CHF: "CHF ",
  AED: "د.إ ", SAR: "﷼ ", EGP: "E£", MAD: "DH ", BRL: "R$", MXN: "MX$",
  TRY: "₺", PLN: "zł ", SEK: "kr ", NOK: "kr ", DKK: "kr ",
}

// Fallback rates: units of `code` per 1 USD (USD is the base currency).
// Used only when both live providers are unreachable.
// Values derived from FX_FALLBACK_NGN (NGN per 1 code): rate[code] = 1600 / FX_FALLBACK_NGN[code].
export const FX_FALLBACK_USD_BASE: Record<string, number> = {
  USD: 1,
  NGN: 1600,
  EUR: 0.925,
  GBP: 0.788,
  GHS: 12.6,
  KES: 129.0,
  ZAR: 18.2,
  CAD: 1.37,
  AUD: 1.52,
  INR: 83.3,
  JPY: 150.9,
  CNY: 7.21,
  SGD: 1.34,
  CHF: 0.88,
  AED: 3.67,
  SAR: 3.75,
  EGP: 47.9,
  MAD: 9.82,
  BRL: 5.48,
  MXN: 17.4,
  TRY: 32.7,
  PLN: 3.98,
  SEK: 10.7,
  NOK: 10.8,
  DKK: 6.94,
}

/** Per-NGN fallback rates (NGN = 1 base), derived from the USD-base fallback.
 *  rate[code] = NGN per 1 USD ÷ NGN per 1 code. Used when live providers fail. */
export const FX_FALLBACK_NGN: Record<string, number> = (() => {
  const ngnPerUsd = Number(FX_FALLBACK_USD_BASE.NGN) || 1600
  const out: Record<string, number> = { NGN: 1, USD: ngnPerUsd }
  for (const [code, usdPerCode] of Object.entries(FX_FALLBACK_USD_BASE)) {
    const r = Number(usdPerCode)
    if (code === "NGN" || code === "USD" || !r || r <= 0) continue
    out[code] = Math.round((ngnPerUsd / r) * 100000) / 100000
  }
  return out
})()

export const fxFormat = (amount: number, currency: string, opts?: { maxFrac?: number }) => {
  const symbol = FX_CURRENCY_SYMBOL[currency] || currency + " "
  const frac = opts?.maxFrac ?? (currency === "NGN" ? 0 : 2)
  return `${symbol}${Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: frac })}`
}

/* ------------------------------------------------------------------ *
 * Shared live FX rate store — cart, checkout, super deals and every
 * display surface consume the exact same USD-based rates so the
 * displayed total and the amount sent to the payment gateway always
 * agree. USD is the base currency: rates[code] = units of `code` per 1 USD.
 * ------------------------------------------------------------------ */

interface FxRateState {
  rates: Record<string, number>
  fetchedAt: number | null
  listeners: Set<() => void>
}

const FX_RATE_KEY = "tp_market_fx_rate_v2"
const FX_RATE_CACHE_MS = 6 * 60 * 60 * 1000 // 6 hours

let fxStore: FxRateState = {
  rates: { ...FX_FALLBACK_USD_BASE },
  fetchedAt: null,
  listeners: new Set(),
}

function notify() {
  fxStore.listeners.forEach((fn) => fn())
}

export { fxStore, notify }

export function getLiveRate(code: string): number {
  const r = fxStore.rates[code.toUpperCase()]
  return Number.isFinite(r) && r > 0 ? r : 1
}

export function getLiveNgnRate(): number {
  return getLiveRate("NGN")
}

export function isFxLoaded(): boolean {
  return fxStore.fetchedAt !== null
}

export function subscribeToFxRate(cb: () => void): () => void {
  fxStore.listeners.add(cb)
  return () => {
    fxStore.listeners.delete(cb)
  }
}

export function usdToNgn(usd: number): number {
  return Math.max(1, Math.round(Number(usd || 0) * getLiveNgnRate()))
}

/** ngnRate kept for backwards compatibility with existing callers. */
export function getLiveNgnRateLegacy(): number {
  return getLiveNgnRate()
}

async function refreshAllFxRates(): Promise<void> {
  try {
    const now = Date.now()
    const cached = typeof localStorage !== "undefined" ? localStorage.getItem(FX_RATE_KEY) : null
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (parsed.fetchedAt && now - parsed.fetchedAt < FX_RATE_CACHE_MS && parsed.rates) {
          fxStore.rates = { USD: 1, ...parsed.rates }
          fxStore.fetchedAt = parsed.fetchedAt
          notify()
          return
        }
      } catch {
        // ignore bad cache
      }
    }

    // Single endpoint returns every rate (per NGN) at once — no per-currency
    // round-trips, no double conversion.
    const res = await fetch(`/api/tools/fx`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const perNgn = json?.rates as Record<string, number> | undefined
    if (!perNgn || !Number.isFinite(perNgn["USD"]) || perNgn["USD"] <= 0) throw new Error("invalid rates")

    // Convert NGN-base rates to USD-base: rate[code] = (NGN per 1 USD) / (NGN per 1 code)
    const ngnPerUsd = perNgn["USD"]
    const rates: Record<string, number> = { USD: 1 }
    for (const [code, ngnPerCode] of Object.entries(perNgn)) {
      const r = Number(ngnPerCode)
      if (code === "USD" || !r || r <= 0) continue
      rates[code] = Math.round((ngnPerUsd / r) * 100000) / 100000
    }

    fxStore.rates = rates
    fxStore.fetchedAt = now
    try {
      typeof localStorage !== "undefined" &&
        localStorage.setItem(FX_RATE_KEY, JSON.stringify({ rates, fetchedAt: now }))
    } catch {
      // ignore
    }
    notify()
  } catch (err) {
    // Keep the previous rates (fallback USD-base) on failure
    fxStore.fetchedAt = fxStore.fetchedAt || Date.now()
    notify()
  }
}

// Kick off the first fetch immediately (module load)
if (typeof window !== "undefined" || typeof process !== "undefined") {
  void refreshAllFxRates()
}

// Exposed for manual refresh from clients.
export { refreshAllFxRates as refreshFxRate }
