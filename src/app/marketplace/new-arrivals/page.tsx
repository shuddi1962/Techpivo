import type { Metadata } from "next"
import { fetchStoreProducts, fetchMarketBanners, fetchMarketMerch } from "@/lib/marketplace-products"
import { pageBannerOf } from "@/lib/marketplace-banners"
import { isNewPick } from "@/lib/marketplace-merch"
import { ProductListing } from "@/components/marketplace/product-listing"
import { StorePageShell, CollectionHero } from "@/components/marketplace/store-shell"

export const revalidate = 60

export const metadata: Metadata = {
  title: "New Arrivals — TechPivo Market",
  description: "The latest products to land on TechPivo Market — fresh stock, quality-checked and tracked.",
}

export default async function MarketplaceNewArrivalsPage() {
  const [all, banners, merchState] = await Promise.all([
    fetchStoreProducts({ order: "newest", limit: 100 }),
    fetchMarketBanners(),
    fetchMarketMerch(),
  ])
  const { merch } = merchState
  // Admin-pinned New arrivals lead, then the genuinely newest.
  const products = [...all].sort(
    (a, b) => Number(isNewPick(merch, b.id)) - Number(isNewPick(merch, a.id))
  )
  return (
    <StorePageShell trail={[{ label: "New Arrivals" }]}>
      <CollectionHero
        kicker="Fresh this week"
        title="New Arrivals"
        copy="The newest products to land in the store — be the first to own them."
        image={pageBannerOf(banners, "new_arrivals_image")}
        links={banners.links}
      />
      <ProductListing products={products} initialMerch={merchState} />
    </StorePageShell>
  )
}
