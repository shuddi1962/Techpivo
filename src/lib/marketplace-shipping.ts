// TechPivo Market delivery (CLIENT-SAFE).
// Options mirror the supplier's courier rates with store markup, plus the
// store's own Standard / Express fallbacks (always available).
export interface ShipOption {
  id: string
  name: string
  eta: string
  feeUsd: number
  source: "supplier" | "store"
}

export interface ShipSelection {
  id: string
  name: string
  eta: string
  feeUsd: number
}

export const SHIP_KEY = "tp_market_ship_v1"
export const EXPRESS_FLAT_USD = 19
export const FREE_SHIP_THRESHOLD_USD = 49
export const STANDARD_FLAT_USD = 5

export function standardFee(subtotalUsd: number): number {
  return subtotalUsd >= FREE_SHIP_THRESHOLD_USD ? 0 : STANDARD_FLAT_USD
}

export function storeShipOptions(subtotalUsd: number): ShipOption[] {
  return [
    { id: "standard", name: "Standard", eta: "7–12 days", feeUsd: standardFee(subtotalUsd), source: "store" },
    { id: "express", name: "Express", eta: "3–7 days", feeUsd: EXPRESS_FLAT_USD, source: "store" },
  ]
}

// Back-compat for the previous fixed-method flow.
export type ShipMethodId = "standard" | "express"

export function shippingCost(subtotalUsd: number, method: ShipMethodId): number {
  if (method === "express") return EXPRESS_FLAT_USD
  return standardFee(subtotalUsd)
}

export function readShipMethod(): ShipMethodId {
  const id = readShipSelection().id
  return id === "express" ? "express" : "standard"
}

export function readShipSelection(): ShipSelection {
  const fallback: ShipSelection = { id: "standard", name: "Standard", eta: "7–12 days", feeUsd: 0 }
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(SHIP_KEY)
    if (!raw) return fallback
    const s = JSON.parse(raw) as Partial<ShipSelection>
    if (typeof s?.id !== "string" || !s.id) return fallback
    return {
      id: s.id.slice(0, 80),
      name: typeof s.name === "string" ? s.name.slice(0, 80) : s.id,
      eta: typeof s.eta === "string" ? s.eta.slice(0, 40) : "",
      feeUsd: Number.isFinite(Number(s.feeUsd)) ? Number(s.feeUsd) : 0,
    }
  } catch {
    return fallback
  }
}

export function saveShipMethod(method: ShipMethodId) {
  saveShipSelection({
    id: method,
    name: method === "express" ? "Express" : "Standard",
    eta: method === "express" ? "3–7 days" : "7–12 days",
    feeUsd: method === "express" ? EXPRESS_FLAT_USD : 0,
  })
}

export function saveShipSelection(sel: ShipSelection) {
  try {
    window.localStorage.setItem(SHIP_KEY, JSON.stringify(sel))
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event("tp-market-ship"))
}
