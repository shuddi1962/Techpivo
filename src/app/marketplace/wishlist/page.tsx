import type { Metadata } from "next"
import { WishlistPage } from "@/components/marketplace/wishlist-page"
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/marketplace-header"

export const metadata: Metadata = {
  title: "Your Wishlist — TechPivo Market",
  description: "Products you saved on TechPivo Market.",
}

export default function MarketplaceWishlistRoute() {
  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen">
      <div className="px-3 sm:px-6 lg:px-10 py-4 space-y-4">
        <MarketplaceHeader />
        <WishlistPage />
        <MarketplaceFooter />
      </div>
    </div>
  )
}
