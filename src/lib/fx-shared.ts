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