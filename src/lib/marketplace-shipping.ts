// TechPivo Market delivery (CLIENT-SAFE).
// Options mirror the supplier's courier rates with store markup, plus the
// store's own Standard / Express fallbacks (always available).
//
// Shared shipping hook used by BOTH cart-page.tsx and checkout-page.tsx so
// identical inputs always produce identical quotes (fixes the cart<->checkout
// shipping mismatch):
//   - useShippingCountry()   -> geo-detected ship-to country (cached)
//   - useShippingOptions()   -> live supplier courier options + store fallback,
//                               active pick resolved against stored selection
//   - storeShipOptions(), visibleShipOptions(), resolveShipActive(), saveShipSelection()
import { getGeoOnce } from "@/lib/tools-geo"

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
export const FREE_SHIP_THRESHOLD_USD = 35
// Fallback when live supplier rates are unreachable. Must cover real CJ
// lane costs (Africa lanes run $8+): never price delivery below cost.
export const STANDARD_FLAT_USD = 9

// Full ship-to country list (full names, CJ-style) — alphabetical like a
// worldwide store. Nigeria is NOT first and never the default.
const SHIP_COUNTRIES_UNSORTED: Array<{ code: string; name: string }> = [
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
  { code: "KE", name: "Kenya" },
  { code: "ZA", name: "South Africa" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IN", name: "India" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "DZ", name: "Algeria" },
  { code: "AO", name: "Angola" },
  { code: "BJ", name: "Benin" },
  { code: "BW", name: "Botswana" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "CM", name: "Cameroon" },
  { code: "CV", name: "Cape Verde" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo" },
  { code: "CD", name: "DR Congo" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "DJ", name: "Djibouti" },
  { code: "EG", name: "Egypt" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "ET", name: "Ethiopia" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "ML", name: "Mali" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "NA", name: "Namibia" },
  { code: "NE", name: "Niger" },
  { code: "RW", name: "Rwanda" },
  { code: "ST", name: "São Tomé & Príncipe" },
  { code: "SN", name: "Senegal" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SO", name: "Somalia" },
  { code: "SS", name: "South Sudan" },
  { code: "SD", name: "Sudan" },
  { code: "SZ", name: "Eswatini" },
  { code: "TZ", name: "Tanzania" },
  { code: "TG", name: "Togo" },
  { code: "TN", name: "Tunisia" },
  { code: "UG", name: "Uganda" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
  { code: "AF", name: "Afghanistan" },
  { code: "BD", name: "Bangladesh" },
  { code: "BT", name: "Bhutan" },
  { code: "BN", name: "Brunei" },
  { code: "KH", name: "Cambodia" },
  { code: "CN", name: "China" },
  { code: "ID", name: "Indonesia" },
  { code: "JP", name: "Japan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "LA", name: "Laos" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" },
  { code: "MN", name: "Mongolia" },
  { code: "MM", name: "Myanmar" },
  { code: "NP", name: "Nepal" },
  { code: "KP", name: "North Korea" },
  { code: "PK", name: "Pakistan" },
  { code: "PH", name: "Philippines" },
  { code: "SG", name: "Singapore" },
  { code: "KR", name: "South Korea" },
  { code: "LK", name: "Sri Lanka" },
  { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TH", name: "Thailand" },
  { code: "TR", name: "Turkey" },
  { code: "TM", name: "Turkmenistan" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VN", name: "Vietnam" },
  { code: "BH", name: "Bahrain" },
  { code: "IQ", name: "Iraq" },
  { code: "IL", name: "Israel" },
  { code: "JO", name: "Jordan" },
  { code: "KW", name: "Kuwait" },
  { code: "LB", name: "Lebanon" },
  { code: "OM", name: "Oman" },
  { code: "PS", name: "Palestine" },
  { code: "QA", name: "Qatar" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "YE", name: "Yemen" },
  { code: "AL", name: "Albania" },
  { code: "AD", name: "Andorra" },
  { code: "AT", name: "Austria" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BA", name: "Bosnia & Herzegovina" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "ME", name: "Montenegro" },
  { code: "NL", name: "Netherlands" },
  { code: "MK", name: "North Macedonia" },
  { code: "NO", name: "Norway" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "SM", name: "San Marino" },
  { code: "RS", name: "Serbia" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "UA", name: "Ukraine" },
  { code: "MX", name: "Mexico" },
  { code: "BR", name: "Brazil" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "PE", name: "Peru" },
  { code: "VE", name: "Venezuela" },
  { code: "EC", name: "Ecuador" },
  { code: "BO", name: "Bolivia" },
  { code: "PY", name: "Paraguay" },
  { code: "UY", name: "Uruguay" },
  { code: "CR", name: "Costa Rica" },
  { code: "PA", name: "Panama" },
  { code: "DO", name: "Dominican Republic" },
  { code: "JM", name: "Jamaica" },
  { code: "TT", name: "Trinidad & Tobago" },
  { code: "NZ", name: "New Zealand" },
  { code: "FJ", name: "Fiji" },
  { code: "PG", name: "Papua New Guinea" },
]

export const SHIP_COUNTRIES: Array<{ code: string; name: string }> = [...SHIP_COUNTRIES_UNSORTED].sort((a, b) =>
  a.name.localeCompare(b.name)
)

// Worldwide default when geo detection fails — never a single home market.
export const DEFAULT_SHIP_COUNTRY = "US"

export function standardFee(subtotalUsd: number, thresholdUsd: number = FREE_SHIP_THRESHOLD_USD): number {
  return subtotalUsd >= thresholdUsd ? 0 : STANDARD_FLAT_USD
}

export function storeShipOptions(subtotalUsd: number, thresholdUsd: number = FREE_SHIP_THRESHOLD_USD): ShipOption[] {
  return [
    { id: "standard", name: "Standard", eta: "7–12 days", feeUsd: standardFee(subtotalUsd, thresholdUsd), source: "store" },
    { id: "express", name: "Express", eta: "3–7 days", feeUsd: EXPRESS_FLAT_USD, source: "store" },
  ]
}

// Single source of truth for which methods are SHOWN and which is ACTIVE.
// DeliveryPicker and checkout-page MUST both use these two helpers so the
// courier the buyer sees is always the courier they are charged for.
// (The bug was: picker displayed the first live courier while checkout
// charged the stored "standard" id from the merged list.)
export function visibleShipOptions(options: ShipOption[], fallbackOptions: ShipOption[]): ShipOption[] {
  const list = options.length > 0 ? options : fallbackOptions
  const live = list.filter((o) => o.source === "supplier")
  return live.length > 0 ? live : list
}

export function resolveShipActive(shown: ShipOption[], value: ShipSelection | null): ShipOption | undefined {
  const activeId = value?.id || "standard"
  return shown.find((o) => o.id === activeId) || shown[0]
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

// Shared country resolution used by BOTH the cart and the checkout page so the
// shipping quote is computed against an identical destination in both places.
// Geo detection is cached (tools-geo.getGeoOnce) so both pages observe the
// same country and never diverge (cart CJPacket Postal vs checkout Standard).
export function useShippingCountry(): string {
  const [country, setCountry] = useState<string>(DEFAULT_SHIP_COUNTRY)
  useEffect(() => {
    getGeoOnce()
      .then((g) => {
        const code = g?.countryCode?.toUpperCase()
        if (code && SHIP_COUNTRIES.some((c) => c.code === code)) setCountry(code)
      })
      .catch(() => {})
  }, [])
  return country
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

// ---------------------------------------------------------------------------
// Shared shipping hook — used by BOTH the cart and the checkout page so the
// buyer always sees one consistent quote and is charged exactly what is
// displayed. Inputs (lines + country + subtotal) are identical → outputs are
// identical, which is what fixes the cart↔checkout shipping mismatch.
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react"

interface ShippingLines {
  product_id: string
  variant_vid: string
  qty: number
}

export interface UseShippingOptionsResult {
  options: ShipOption[]
  shownOptions: ShipOption[]
  activePick: ShipOption | undefined
  shipping: number
  fetchOptions: () => void
}

/**
 * Resolve live shipping options for a set of cart lines.
 * `country` defaults to DEFAULT_SHIP_COUNTRY; `subtotal` is the cart subtotal in USD.
 * Returns options + the active pick (resolved against the stored selection so
 * the method the buyer sees is always the method they are charged for).
 *
 * Both the cart page and the checkout page call this with identical inputs so
 * they always render the same quote — fixing the cart↔checkout shipping
 * mismatch. The active pick is derived from the stored selection
 * (readShipSelection) but falls back to the first available option when the
 * stored method isn't offered for the current cart/country.
 */
export function useShippingOptions({
  lines,
  country,
  subtotal,
}: {
  lines: ShippingLines[]
  country: string
  subtotal: number
}): UseShippingOptionsResult {
  const [options, setOptions] = useState<ShipOption[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchOptions = () => {
    if (lines.length === 0) {
      setOptions([])
      return
    }
    fetch("/api/marketplace/shipping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: lines, country, subtotal }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (mounted && Array.isArray(d?.options)) setOptions(d.options as ShipOption[])
      })
      .catch(() => {
        // fallbacks below still render
      })
  }

  useEffect(() => {
    fetchOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(lines), country, String(subtotal)])

  const effectiveOptions = options.length > 0 ? options : storeShipOptions(subtotal)
  const shownOptions = visibleShipOptions(effectiveOptions, [])
  // Resolve the active method against the stored selection; if the stored
  // method isn't offered for this cart/country, fall back to the first option
  // so the buyer is always charged for a method that is actually shown.
  const activePick = resolveShipActive(shownOptions, readShipSelection())
  const shipping = activePick ? activePick.feeUsd : 0

  return { options, shownOptions, activePick, shipping, fetchOptions }
}
