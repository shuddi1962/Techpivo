import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { WishlistPage } from "@/components/marketplace/wishlist-page"
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/marketplace-header"

export const metadata: Metadata = {
  title: "Your Wishlist — TechPivo Market",
  description: "Products you saved on TechPivo Market.",
}

export default function MarketplaceWishlistRoute() {
  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen">
      <MarketplaceHeader />
      <main className="mx-auto w-full max-w-[1400px] px-3 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/marketplace" className="hover:text-[#0F172A]">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-[#0F172A]">Wishlist</span>
        </nav>
        <WishlistPage />
      </main>
      <MarketplaceFooter />
    </div>
  )
}
