import type { Metadata } from "next"
import { fetchStoreProducts } from "@/lib/marketplace-products"
import { ProductListing } from "@/components/marketplace/product-listing"
import { StorePageShell, CollectionHero } from "@/components/marketplace/store-shell"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Shop All Products — TechPivo Market",
  description: "Browse every product on TechPivo Market — filter by price, color, size, rating and more.",
}

export default async function MarketplaceShopPage() {
  const products = await fetchStoreProducts({ limit: 150 })
  return (
    <StorePageShell trail={[{ label: "Shop" }]}>
      <CollectionHero
        kicker="TechPivo Market"
        title="Shop All Products"
        copy="Every product in one place — use the filters to narrow by price, color, size, rating and features."
      />
      <ProductListing products={products} />
    </StorePageShell>
  )
}
