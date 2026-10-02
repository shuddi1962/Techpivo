import type { Metadata } from "next"
import { fetchStoreProducts } from "@/lib/marketplace-products"
import { ProductListing } from "@/components/marketplace/product-listing"
import { StorePageShell, CollectionHero } from "@/components/marketplace/store-shell"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Best Sellers — TechPivo Market",
  description: "The most-viewed products on TechPivo Market — shop what everyone else is buying.",
}

export default async function MarketplaceBestSellersPage() {
  const products = await fetchStoreProducts({ order: "popular", limit: 100 })
  return (
    <StorePageShell trail={[{ label: "Best Sellers" }]}>
      <CollectionHero
        kicker="Loved by shoppers"
        title="Best Sellers"
        copy="Ranked by real shopper interest — the products everyone keeps coming back for."
        theme="orange"
      />
      <ProductListing products={products} />
    </StorePageShell>
  )
}
