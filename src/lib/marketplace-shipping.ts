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
