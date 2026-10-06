import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { ChevronRight } from "lucide-react"
import { TrackPage } from "@/components/marketplace/track-page"
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/marketplace-header"
import { CollectionHero } from "@/components/marketplace/store-shell"
import { fetchMarketBanners } from "@/lib/marketplace-products"
import { pageBannerOf } from "@/lib/marketplace-banners"

export const metadata: Metadata = {
  title: "Track Your Order — TechPivo Market",
  description: "Track your TechPivo Market order with your payment reference and email.",
}

export const revalidate = 60

export default async function MarketplaceTrackRoute() {
  const banners = await fetchMarketBanners()
  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen">
      <MarketplaceHeader />
      <main className="mx-auto w-full max-w-[1400px] px-3 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/marketplace" className="hover:text-[#0F172A]">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-[#0F172A]">Track Order</span>
        </nav>
        <CollectionHero
          kicker="TechPivo Market"
          title="Track Your Order"
          copy="Enter your payment reference and email to see your order and live delivery status."
          image={pageBannerOf(banners, "track_image")}
        />
        <Suspense fallback={<div className="bg-white rounded-2xl border p-10 text-center text-sm text-slate-500">Loading...</div>}>
          <TrackPage />
        </Suspense>
      </main>
      <MarketplaceFooter />
    </div>
  )
}

