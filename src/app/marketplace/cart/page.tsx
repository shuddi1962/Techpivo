import type { Metadata } from "next"
import { CartPage } from "@/components/marketplace/cart-page"
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/marketplace-header"

export const metadata: Metadata = {
  title: "Your Cart — TechPivo Market",
  description: "Review your TechPivo Market cart and check out securely with Paystack.",
}

export default function MarketplaceCartRoute() {
  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen">
      <div className="px-3 sm:px-6 lg:px-10 py-4 space-y-4">
        <MarketplaceHeader />
        <CartPage />
        <MarketplaceFooter />
      </div>
    </div>
  )
}

