// Shared dropdown option data for the Ad Marketplace (admin + public /advertise)

export const ADS_CURRENCIES = [
  { code: "NGN", label: "NGN — Nigerian Naira", symbol: "₦" },
  { code: "USD", label: "USD — US Dollar", symbol: "$" },
  { code: "EUR", label: "EUR — Euro", symbol: "€" },
  { code: "GBP", label: "GBP — British Pound", symbol: "£" },
  { code: "GHS", label: "GHS — Ghanaian Cedi", symbol: "GH₵" },
  { code: "KES", label: "KES — Kenyan Shilling", symbol: "KSh" },
  { code: "ZAR", label: "ZAR — South African Rand", symbol: "R" },
  { code: "CAD", label: "CAD — Canadian Dollar", symbol: "C$" },
  { code: "AUD", label: "AUD — Australian Dollar", symbol: "A$" },
  { code: "INR", label: "INR — Indian Rupee", symbol: "₹" },
] as const

export const ADS_FREQUENCIES = [
  { value: "day", label: "Per Day" },
  { value: "week", label: "Per Week" },
  { value: "month", label: "Per Month" },
] as const

export const ADS_GOALS = [
  { value: "awareness", label: "Brand Awareness", icon: "👁" },
  { value: "impressions", label: "More Impressions", icon: "📈" },
  { value: "clicks", label: "More Clicks", icon: "🖱" },
  { value: "visits", label: "Website Visits", icon: "🌐" },
  { value: "app_downloads", label: "App Downloads", icon: "📲" },
  { value: "conversions", label: "Conversions / Sales", icon: "💰" },
  { value: "leads", label: "Leads / Signups", icon: "✉️" },
] as const

export const ADS_CTA_TYPES = [
  { value: "learn_more", label: "Learn More" },
  { value: "buy_now", label: "Buy Now" },
  { value: "shop_now", label: "Shop Now" },
  { value: "get_started", label: "Get Started" },
  { value: "try_free", label: "Try Free" },
  { value: "sign_up", label: "Sign Up" },
  { value: "subscribe", label: "Subscribe" },
  { value: "download", label: "Download" },
  { value: "watch_video", label: "Watch Video" },
  { value: "read_more", label: "Read More" },
  { value: "book_now", label: "Book Now" },
  { value: "apply_now", label: "Apply Now" },
  { value: "contact_us", label: "Contact Us" },
  { value: "call_now", label: "Call Now" },
] as const

export const ADS_AUDIENCE_COUNTRIES = [
  "Nigeria", "Kenya", "Ghana", "South Africa", "United States", "United Kingdom",
  "India", "Canada", "Australia", "Germany", "France", "Netherlands", "UAE", "Egypt", "Morocco",
]

export const ADS_AUDIENCE_DEVICES = ["Desktop", "Mobile", "Tablet"] as const

export const ADS_AUDIENCE_INTERESTS = [
  "AI & Automation", "Programming", "Cybersecurity", "Gadgets & Reviews", "Networking & IT",
  "Web Development", "Digital Business", "Tech News", "Tutorials",
] as const

export const ADS_GOAL_LABELS: Record<string, string> = Object.fromEntries(
  ADS_GOALS.map((g) => [g.value, g.label])
) as Record<string, string>

export const ADS_CTA_LABELS: Record<string, string> = Object.fromEntries(
  ADS_CTA_TYPES.map((c) => [c.value, c.label])
) as Record<string, string>

export const ADS_FREQUENCY_LABELS: Record<string, string> = Object.fromEntries(
  ADS_FREQUENCIES.map((f) => [f.value, f.label])
) as Record<string, string>

export const ADS_CURRENCY_SYMBOL: Record<string, string> = Object.fromEntries(
  ADS_CURRENCIES.map((c) => [c.code, c.symbol])
) as Record<string, string>

export const DEFAULT_FX_RATES: Record<string, number> = {
  NGN: 1, USD: 1600, EUR: 1730, GBP: 2030, GHS: 127, KES: 12.4, ZAR: 88, CAD: 1170, AUD: 1050, INR: 19.2,
}

// Format an amount in a given currency code
export const formatMoney = (amount: number | string | null | undefined, currency: string) => {
  const symbol = ADS_CURRENCY_SYMBOL[currency] || currency + " "
  return symbol + Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: currency === "NGN" ? 0 : 2 })
}
