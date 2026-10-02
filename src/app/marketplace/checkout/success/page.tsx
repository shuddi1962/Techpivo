import type { Metadata } from "next"
import { CheckoutSuccess } from "@/components/marketplace/checkout-success"
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/marketplace-header"

export const metadata: Metadata = {
  title: "Order confirmed — TechPivo Market",
  description: "Your TechPivo Market payment status and order tracking details.",
}

export default function CheckoutSuccessRoute() {
  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen">
      <div className="px-3 sm:px-6 lg:px-10 py-4 space-y-4">
        <MarketplaceHeader />
        <CheckoutSuccess />
        <MarketplaceFooter />
      </div>
    </div>
  )
}

