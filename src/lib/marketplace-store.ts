// TechPivo Market — public store contact info (DB-driven, admin-editable).
// Stored in site_settings under key "marketplace_store" as JSON:
//   { address, phone, email }
// Powers the storefront footer contact block. Empty/missing fields fall
// back to the defaults below.

export interface MarketStore {
  address: string
  phone: string
  email: string
  /** Footer contact block visibility. False = hidden publicly. */
  contact_visible: boolean
}

export const MARKET_STORE_DEFAULTS: MarketStore = {
  address: "Lagos • Nairobi • Accra — ships worldwide",
  phone: "+234 (0) 800 000 0000",
  email: "market@techpivo.com",
  contact_visible: true,
}

export function sanitizeStore(raw: unknown): MarketStore {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const str = (v: unknown, fb: string) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : fb
  return {
    address: str(r.address, MARKET_STORE_DEFAULTS.address),
    phone: str(r.phone, MARKET_STORE_DEFAULTS.phone),
    email: str(r.email, MARKET_STORE_DEFAULTS.email),
    contact_visible: typeof r.contact_visible === "boolean" ? r.contact_visible : true,
  }
}
