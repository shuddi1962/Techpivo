import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { CartPage } from "@/components/marketplace/cart-page"
import { MarketplaceFooter, MarketplaceHeader } from "@/components/marketplace/marketplace-header"

export const metadata: Metadata = {
  title: "Your Cart — TechPivo Market",
  description: "Review your TechPivo Market cart and check out securely.",
}

export default function MarketplaceCartRoute() {
  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen marketplace-body">
      <MarketplaceHeader />
      <main className="mx-auto w-full max-w-[1400px] px-3 pt-2 sm:px-6 lg:px-10 sm:pt-3 pb-6 sm:pb-8 space-y-6 sm:space-y-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/marketplace" className="hover:text-[#0F172A]">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-[#0F172A]">Shopping Cart</span>
        </nav>
        <CartPage />
      </main>
      <MarketplaceFooter />
    </div>
  )
}

