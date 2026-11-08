export const FX_CURRENCY_LABELS: Record<string, string> = {
  NGN: "Nigerian Naira", USD: "US Dollar", EUR: "Euro", GBP: "British Pound",
  GHS: "Ghanaian Cedi", KES: "Kenyan Shilling", ZAR: "South African Rand",
  CAD: "Canadian Dollar", AUD: "Australian Dollar", INR: "Indian Rupee",
  JPY: "Japanese Yen", CNY: "Chinese Yuan", SGD: "Singapore Dollar", CHF: "Swiss Franc",
  AED: "UAE Dirham", SAR: "Saudi Riyal", EGP: "Egyptian Pound", MAD: "Moroccan Dirham",
  BRL: "Brazilian Real", MXN: "Mexican Peso", TRY: "Turkish Lira", PLN: "Polish Zloty",
}

export const FX_POPULAR: string[] = ["NGN", "USD", "EUR", "GBP", "GHS", "KES", "ZAR", "CAD", "AUD", "INR", "JPY", "AED"]

export const FX_CURRENCY_SYMBOL: Record<string, string> = {
  NGN: "₦", USD: "$", EUR: "€", GBP: "£", GHS: "GH₵", KES: "KSh", ZAR: "R",
  CAD: "C$", AUD: "A$", INR: "₹", JPY: "¥", CNY: "¥", SGD: "S$", CHF: "CHF ",
  AED: "د.إ ", SAR: "﷼ ", EGP: "E£", MAD: "DH ", BRL: "R$", MXN: "MX$",
  TRY: "₺", PLN: "zł ", SEK: "kr ", NOK: "kr ", DKK: "kr ",
}

// Fallback NGN-per-unit rates used only when both live providers are unreachable.
export const FX_FALLBACK_NGN: Record<string, number> = {
  NGN: 1, USD: 1600, EUR: 1730, GBP: 2030, GHS: 127, KES: 12.4, ZAR: 88,
  CAD: 1170, AUD: 1050, INR: 19.2, JPY: 10.6, CNY: 222, SGD: 1190,
  CHF: 1810, AED: 436, SAR: 427, EGP: 33.4, MAD: 163,
  BRL: 292, MXN: 92, TRY: 49, PLN: 402, SEK: 150, NOK: 148, DKK: 232,
}

export const fxFormat = (amount: number, currency: string, opts?: { maxFrac?: number }) => {
  const symbol = FX_CURRENCY_SYMBOL[currency] || currency + " "
  const frac = opts?.maxFrac ?? (currency === "NGN" ? 0 : 2)
  return `${symbol}${Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: frac })}`
}

/* ------------------------------------------------------------------ *
 * Shared live FX rate store — cart, checkout, and super deals all
 * consume the exact same rate so the displayed total and the amount
 * sent to the payment gateway always agree.                        *
 * ------------------------------------------------------------------ */

interface FxRateState {
  ngnRate: number
  usdRate: number
  fetchedAt: number | null
  listeners: Set<() => void>
}

const FX_RATE_KEY = "tp_market_fx_rate_v1"
const FX_RATE_CACHE_MS = 6 * 60 * 60 * 1000 // 6 hours

let fxStore: FxRateState = {
  ngnRate: 1600,
  usdRate: 1,
  fetchedAt: null,
  listeners: new Set(),
}

function notify() {
  fxStore.listeners.forEach((fn) => fn())
}

export { fxStore, notify, refreshFxRate }

export function getLiveNgnRate(): number {
  return fxStore.ngnRate
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

async function refreshFxRate(): Promise<void> {
  try {
    const now = Date.now()
    const cached = typeof localStorage !== "undefined" ? localStorage.getItem(FX_RATE_KEY) : null
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (parsed.fetchedAt && now - parsed.fetchedAt < FX_RATE_CACHE_MS) {
          fxStore.ngnRate = parsed.ngnRate
          fxStore.usdRate = parsed.usdRate
          fxStore.fetchedAt = parsed.fetchedAt
          notify()
        }
      } catch {
        // ignore bad cache
      }
    }

    const res = await fetch(`/api/tools/fx?from=USD&to=NGN&amount=1`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const rate = Number(json?.rate)
    if (!Number.isFinite(rate) || rate <= 0) throw new Error("invalid rate")

    // Clamp unreasonably low NGN rates (e.g. API returned ~1 instead of ~1600)
    const safeRate = rate < 10 ? 1600 : rate

    fxStore.ngnRate = safeRate
    fxStore.usdRate = 1
    fxStore.fetchedAt = Date.now()
    try {
      typeof localStorage !== "undefined" &&
        localStorage.setItem(FX_RATE_KEY, JSON.stringify({
          ngnRate: safeRate,
          usdRate: 1,
          fetchedAt: fxStore.fetchedAt,
        }))
    } catch {
      // ignore
    }
    notify()
  } catch (err) {
    // Keep the previous rate (fallback 1600) on failure
    fxStore.fetchedAt = fxStore.fetchedAt || Date.now()
    notify()
  }
}

// Kick off the first fetch immediately (module load)
if (typeof window !== "undefined" || typeof process !== "undefined") {
  void refreshFxRate()
}