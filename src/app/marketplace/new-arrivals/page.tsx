import type { Metadata } from "next"
import { fetchStoreProducts } from "@/lib/marketplace-products"
import { ProductListing } from "@/components/marketplace/product-listing"
import { StorePageShell, CollectionHero } from "@/components/marketplace/store-shell"

export const revalidate = 60

export const metadata: Metadata = {
  title: "New Arrivals — TechPivo Market",
  description: "The latest products to land on TechPivo Market — fresh stock, quality-checked and tracked.",
}

export default async function MarketplaceNewArrivalsPage() {
  const products = await fetchStoreProducts({ order: "newest", limit: 100 })
  return (
    <StorePageShell trail={[{ label: "New Arrivals" }]}>
      <CollectionHero
        kicker="Fresh this week"
        title="New Arrivals"
        copy="The newest products to land in the store — be the first to own them."
      />
      <ProductListing products={products} />
    </StorePageShell>
  )
}
