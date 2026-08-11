export interface GeoInfo {
  ip: string
  country: string
  countryCode: string
  region: string
  regionName: string
  city: string
  lat: number
  lon: number
  timezone: string
  currency: string
  isp: string
  source: "ip-api" | "ipwhois" | "unknown"
}

export const GEO_CACHE_KEY = "tp_geo"
export const GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000

export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD", CA: "CAD", GB: "GBP", AU: "AUD", SG: "SGD", CH: "CHF", JP: "JPY",
  CN: "CNY", HK: "HKD", IN: "INR", NG: "NGN", GH: "GHS", KE: "KES", EG: "EGP",
  ZA: "ZAR", MA: "MAD", DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
  BE: "EUR", IE: "EUR", PT: "EUR", AT: "EUR", FI: "EUR", GR: "EUR", AE: "AED",
  SA: "SAR", BR: "BRL", MX: "MXN", AR: "ARS", PK: "PKR", BD: "BDT", LK: "LKR",
  NZ: "NZD", MY: "MYR", TH: "THB", PH: "PHP", ID: "IDR", VN: "VND", TR: "TRY",
  PL: "PLN", SE: "SEK", NO: "NOK", DK: "DKK", CZ: "CZK", RO: "RON", UY: "UYU",
  CO: "COP", CL: "CLP", PE: "PEN", ET: "ETB", TZ: "TZS", UG: "UGX", RW: "RWF",
  SN: "XOF", CI: "XOF", CM: "XAF", GA: "XAF", CD: "CDF", AO: "AOA", MZ: "MZN",
  ZW: "ZWL", BW: "BWP", NA: "NAD", GM: "GMD", SL: "SLL", LR: "LRD", ML: "XOF",
  BF: "XOF", NE: "XOF", TG: "XOF", BJ: "XOF", GN: "GNF", MR: "MRU",
}