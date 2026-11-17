import type { Metadata } from "next"
import { MarketplaceHome } from "@/components/marketplace/marketplace-home"
import { MarketMerchProvider } from "@/components/marketplace/market-flags"
import { fetchMarketMerch } from "@/lib/marketplace-products"
import { MarketplaceHeader } from "@/components/marketplace/marketplace-header"
import { MobileHomeHeader } from "@/components/marketplace/mobile-home-header"

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
      {/* Header bar — logo + wishlist + cart + menu (mobile + desktop) */}
      <MarketplaceHeader />
      {/* Mobile search bar — standalone, full width, under the header */}
      <MobileHomeHeader className="md:hidden" />
      <MarketplaceHome />
    </MarketMerchProvider>
  )
}
