import type { Metadata } from "next"
import { MarketplaceHome } from "@/components/marketplace/marketplace-home"
import { MarketMerchProvider } from "@/components/marketplace/market-flags"
import { fetchMarketMerch } from "@/lib/marketplace-products"

export const metadata: Metadata = {
  title: "TechPivo Market — Curated Tech Products & Deals",
  description:
    "Shop curated tech products, gadgets and deals on TechPivo Market — editor-reviewed picks, flash sales, top vendors and buying guides.",
}

export default async function MarketplacePage() {
  // Seed the merch flags at render so the first paint already matches the
  // admin's latest change (no stale badges flashing before the live fetch).
  const initialMerch = await fetchMarketMerch()
  return (
    <MarketMerchProvider initial={initialMerch}>
      <MarketplaceHome />
    </MarketMerchProvider>
  )
}
