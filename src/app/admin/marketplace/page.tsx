"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { MarketplaceCategoriesTab } from "@/components/admin/marketplace-categories-tab"
import { MarketplaceBannersTab } from "@/components/admin/marketplace-banners-tab"
import { MarketplaceCjTab } from "@/components/admin/marketplace-cj-tab"
import { MarketplaceUpsellsTab } from "@/components/admin/marketplace-upsells-tab"
import { MarketplaceOrdersTab } from "@/components/admin/marketplace-orders-tab"
import { MarketplacePaymentsTab } from "@/components/admin/marketplace-payments-tab"
import { MarketplaceReviewsTab } from "@/components/admin/marketplace-reviews-tab"
import { MarketplacePromotionsTab } from "@/components/admin/marketplace-promotions-tab"
import { MarketplaceDashboardTab } from "@/components/admin/marketplace-dashboard-tab"
import { MarketplaceProductsTab } from "@/components/admin/marketplace-products-tab"
import { MarketplaceVisibilityTab } from "@/components/admin/marketplace-visibility-tab"
import { MarketplaceFeedTab } from "@/components/admin/marketplace-feed-tab"
import { isMarketSection, MarketplaceSectionPills } from "@/components/admin/marketplace-nav"

// Section switching lives in the global admin sidebar (which shows the
// Marketplace nav on this page), so this file is only a router — every
// section owns its own page bar, KPI strip and content.
export default function AdminMarketplacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center font-medium text-amber-600">
          Loading TechPivo Market...
        </div>
      }
    >
      <AdminMarketplacePageInner />
    </Suspense>
  )
}

function AdminMarketplacePageInner() {
  const searchParams = useSearchParams()
  const sectionParam = searchParams.get("section")
  const tab = isMarketSection(sectionParam) ? sectionParam : "dashboard"

  return (
    <div className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-6 sm:py-6">
      {/* mobile-first section switcher — the sidebar is hidden below lg */}
      <div className="sticky top-0 z-30 -mx-1 mb-2 bg-[#F8FAFC]/95 py-1 backdrop-blur supports-[backdrop-filter]:bg-[#F8FAFC]/80 lg:hidden">
        <MarketplaceSectionPills />
      </div>

      <div className="min-w-0">
        {tab === "dashboard" && <MarketplaceDashboardTab />}

        {tab === "products" && <MarketplaceProductsTab />}

        {tab === "orders" && <MarketplaceOrdersTab />}

        {tab === "reviews" && <MarketplaceReviewsTab />}

        {tab === "promotions" && <MarketplacePromotionsTab />}

        {tab === "banners" && <MarketplaceBannersTab />}

        {tab === "upsells" && <MarketplaceUpsellsTab />}

        {tab === "categories" && <MarketplaceCategoriesTab />}

        {tab === "cj" && <MarketplaceCjTab />}

        {tab === "payments" && <MarketplacePaymentsTab />}

        {tab === "visibility" && <MarketplaceVisibilityTab />}

        {tab === "feed" && <MarketplaceFeedTab />}
      </div>
    </div>
  )
}
