// TechPivo Market commerce event bus (CLIENT-SAFE — no server imports).
// Decoupled triggers so any card, button, or page can open the cart popup,
// Quick View modal, or checkout modal without prop-drilling. Providers
// (mounted once in MarketCommerce) subscribe to these window events.

export const TPM_CART_OPEN = "tpm:cart-open"
export const TPM_QUICKVIEW = "tpm:quickview"
export const TPM_CHECKOUT = "tpm:checkout"

function dispatch<T>(name: string, detail?: T) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

/** Open the instant cart popup after a successful add. detail carries the just-added product id for highlight. */
export function openCartPopup(productId?: string) {
  dispatch<{ productId?: string }>(TPM_CART_OPEN, { productId })
}

/** Open the Quick View modal for a product id. No-op for non-UUID ids (demo rows without live products). */
export function openQuickView(productId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(productId)) return
  dispatch<{ productId: string }>(TPM_QUICKVIEW, { productId })
}

/** Open the checkout modal (uses the existing cart + Korapay flow). */
export function openCheckout() {
  dispatch(TPM_CHECKOUT)
}

// ---------------------------------------------------------------------------
// Conversion analytics — best-effort, privacy-conscious (no PII, product ids
// + counts only). Server persists to marketplace_events when migrated;
// localStorage counters keep the admin report honest offline.
// ---------------------------------------------------------------------------

export type MarketEventKind =
  | "quickview_open"
  | "quickview_add"
  | "recommend_impression"
  | "recommend_select"
  | "recommend_add"
  | "cart_open"
  | "cart_qty"
  | "cart_remove"
  | "checkout_start"
  | "checkout_pay_attempt"
  | "checkout_success"
  | "checkout_fail"
  | "bundle_add"

const ANALYTICS_KEY = "tpm_analytics_v1"
const MAX_STORED = 200

interface StoredEvent {
  kind: MarketEventKind
  product_id?: string
  at: number
}

function readStored(): StoredEvent[] {
  try {
    const raw = window.localStorage.getItem(ANALYTICS_KEY)
    const arr = raw ? (JSON.parse(raw) as StoredEvent[]) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function trackMarket(kind: MarketEventKind, productId?: string) {
  if (typeof window === "undefined") return
  try {
    const next = [...readStored(), { kind, product_id: productId, at: Date.now() }].slice(-MAX_STORED)
    window.localStorage.setItem(ANALYTICS_KEY, JSON.stringify(next))
  } catch {
    // storage blocked — server event below still fires
  }
  // Server-side aggregate (never blocks the UI, never throws).
  try {
    const body: Record<string, string> = { kind }
    if (productId && /^[0-9a-f-]{8,64}$/i.test(productId)) body.product_id = productId
    fetch("/api/marketplace/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {
      // analytics is best-effort
    })
  } catch {
    // ignore
  }
}

/** Local counts for the admin report fallback + "collecting data" states. */
export function marketEventCounts(): Record<MarketEventKind, number> {
  const counts = {} as Record<MarketEventKind, number>
  if (typeof window === "undefined") return counts
  for (const e of readStored()) {
    counts[e.kind] = (counts[e.kind] || 0) + 1
  }
  return counts
}
