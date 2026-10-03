// TechPivo Market delivery methods (CLIENT-SAFE).
// Standard: tracked 7–12 days, $5 under $49, FREE over $49.
// Express: tracked 3–7 days, $19 flat.
export type ShipMethodId = "standard" | "express"

export interface ShipMethod {
  id: ShipMethodId
  name: string
  eta: string
  detail: string
}

export const SHIP_METHODS: ShipMethod[] = [
  { id: "standard", name: "Standard", eta: "7–12 days", detail: "Tracked delivery" },
  { id: "express", name: "Express", eta: "3–7 days", detail: "Priority tracked delivery" },
]

export const SHIP_KEY = "tp_market_ship_v1"
export const EXPRESS_FLAT_USD = 19
export const FREE_SHIP_THRESHOLD_USD = 49
export const STANDARD_FLAT_USD = 5

export function shippingCost(subtotalUsd: number, method: ShipMethodId): number {
  if (method === "express") return EXPRESS_FLAT_USD
  return subtotalUsd >= FREE_SHIP_THRESHOLD_USD ? 0 : STANDARD_FLAT_USD
}

export function readShipMethod(): ShipMethodId {
  if (typeof window === "undefined") return "standard"
  try {
    return window.localStorage.getItem(SHIP_KEY) === "express" ? "express" : "standard"
  } catch {
    return "standard"
  }
}

export function saveShipMethod(method: ShipMethodId) {
  try {
    window.localStorage.setItem(SHIP_KEY, method)
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event("tp-market-ship"))
}
