"use client"

import { formatMarketPrice, useMarketCurrency, useUsdNgnRate } from "@/lib/marketplace-pricing"

// Storefront price label that follows the header USD/NGN switch in real
// time on every mount. Renders "$4.92" in USD mode, "₦7,872" in NGN mode
// (converted at the live rate).
export function MarketPrice({
  usd,
  className,
  title,
}: {
  usd: number | null | undefined
  className?: string
  title?: string
}) {
  const currency = useMarketCurrency()
  const rate = useUsdNgnRate()
  return (
    <span className={className} title={title}>
      {formatMarketPrice(usd, rate, currency)}
    </span>
  )
}
