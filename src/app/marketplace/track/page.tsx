import type { Metadata } from "next"
import { Suspense } from "react"
import { TrackPage } from "@/components/marketplace/track-page"
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/marketplace-header"

export const metadata: Metadata = {
  title: "Track Your Order — TechPivo Market",
  description: "Track your TechPivo Market order with your payment reference and email.",
}

export default function MarketplaceTrackRoute() {
  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen">
      <div className="px-3 sm:px-6 lg:px-10 py-4 space-y-4">
        <MarketplaceHeader />
        <Suspense fallback={<div className="bg-white rounded-2xl border p-10 text-center text-sm text-slate-500">Loading...</div>}>
          <TrackPage />
        </Suspense>
        <MarketplaceFooter />
      </div>
    </div>
  )
}

