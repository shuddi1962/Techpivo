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

export const ADS_BILLING_MODELS = [
  { value: "cpm", label: "CPM — pay per 1,000 impressions" },
  { value: "cpc", label: "CPC — pay per click" },
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
  "Nigeria", "Kenya", "Ghana", "South Africa", "Egypt", "Morocco", "Algeria", "Tunisia", "Libya", "Sudan",
  "Ethiopia", "Somalia", "Uganda", "Tanzania", "Rwanda", "Burundi", "DR Congo", "Congo", "Gabon", "Cameroon",
  "Central African Republic", "Chad", "Niger", "Mali", "Burkina Faso", "Senegal", "Gambia", "Guinea",
  "Guinea-Bissau", "Sierra Leone", "Liberia", "Ivory Coast", "Benin", "Togo", "Angola", "Zambia", "Zimbabwe",
  "Malawi", "Mozambique", "Botswana", "Namibia", "Eswatini", "Lesotho", "Madagascar", "Mauritius",
  "Seychelles", "Cape Verde", "Comoros", "Mauritania",
  "United States", "Canada", "Mexico", "Brazil", "Argentina", "Chile", "Colombia", "Peru", "Venezuela",
  "Ecuador", "Bolivia", "Paraguay", "Uruguay", "Costa Rica", "Panama", "Dominican Republic", "Jamaica",
  "Trinidad and Tobago", "Bahamas", "Puerto Rico", "Guatemala", "Honduras", "El Salvador", "Nicaragua", "Cuba", "Haiti",
  "United Kingdom", "Ireland", "Germany", "France", "Spain", "Portugal", "Italy", "Netherlands", "Belgium",
  "Switzerland", "Austria", "Sweden", "Norway", "Denmark", "Finland", "Iceland", "Poland", "Czechia",
  "Slovakia", "Hungary", "Romania", "Bulgaria", "Greece", "Croatia", "Serbia", "Ukraine", "Turkey",
  "India", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal", "China", "Japan", "South Korea", "Taiwan",
  "Hong Kong", "Philippines", "Indonesia", "Malaysia", "Singapore", "Thailand", "Vietnam", "Cambodia",
  "Myanmar", "Saudi Arabia", "UAE", "Qatar", "Kuwait", "Bahrain", "Oman", "Jordan", "Lebanon", "Israel",
  "Iran", "Iraq", "Kazakhstan", "Uzbekistan",
  "Australia", "New Zealand", "Fiji", "Papua New Guinea",
]

export const ADS_AUDIENCE_DEVICES = ["Desktop", "Mobile", "Tablet"] as const

export const ADS_AUDIENCE_INTERESTS = [
  "AI & Automation", "Programming", "Cybersecurity", "Gadgets & Reviews", "Networking & IT",
  "Web Development", "Digital Business", "Tech News", "Tutorials",
  "Fashion & Style", "Music", "Sports", "Gaming", "Finance & Investments", "Health & Fitness",
  "Education", "Travel & Tourism", "Food & Recipes", "Real Estate", "Crypto & Blockchain",
  "Movies & TV", "Business & Entrepreneurship", "Photography & Design", "Beauty & Skincare",
  "Automotive", "Agriculture", "Books & Reading", "Science & Space", "Startups & VC", "Jobs & Careers",
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

export const ADS_BILLING_LABELS: Record<string, string> = {
  cpm: "CPM",
  cpc: "CPC",
  per_day: "Per Day",
  per_week: "Per Week",
  per_month: "Per Month",
  impressions: "Impressions",
}

// Spend = actual spend if tracked, otherwise derived from delivery × bid
export const computeCampaignSpend = (c: {
  spend?: number | null
  billing_model?: string | null
  impressions?: number | null
  clicks?: number | null
  bid_amount?: number | null
}) => {
  const tracked = Number(c.spend || 0)
  if (tracked > 0) return tracked
  const bid = Number(c.bid_amount || 0)
  if (c.billing_model === "cpc") return Math.round(Number(c.clicks || 0) * bid * 100) / 100
  if (c.billing_model === "cpm") return Math.round((Number(c.impressions || 0) / 1000) * bid * 100) / 100
  return 0
}

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
