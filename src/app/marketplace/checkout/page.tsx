import type { Metadata } from "next"
import { CheckoutPage } from "@/components/marketplace/checkout-page"
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/marketplace-header"

export const metadata: Metadata = {
  title: "Checkout — TechPivo Market",
  description: "Enter delivery details and pay securely with Paystack on TechPivo Market.",
}

export default function MarketplaceCheckoutRoute() {
  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen">
      <div className="px-3 sm:px-6 lg:px-10 py-4 space-y-4">
        <MarketplaceHeader />
        <CheckoutPage />
        <MarketplaceFooter />
      </div>
    </div>
  )
}

