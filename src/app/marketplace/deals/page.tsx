import type { Metadata } from "next"
import { fetchStoreProducts } from "@/lib/marketplace-products"
import { discountOf } from "@/lib/marketplace-catalog"
import { ProductListing } from "@/components/marketplace/product-listing"
import { StorePageShell, CollectionHero } from "@/components/marketplace/store-shell"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Deals of the Day — TechPivo Market",
  description: "Today's biggest price drops on TechPivo Market — quality-checked products with tracked delivery.",
}

export default async function MarketplaceDealsPage() {
  const all = await fetchStoreProducts({ limit: 150 })
  const products = all
    .filter((p) => discountOf(p) > 0)
    .sort((a, b) => discountOf(b) - discountOf(a))
  return (
    <StorePageShell trail={[{ label: "Deals of the Day" }]}>
      <CollectionHero
        kicker="Limited-time price drops"
        title="Deals of the Day"
        copy="The biggest discounts in the store right now — when the price drops, it goes fast."
        theme="red"
      />
      <ProductListing products={products} />
    </StorePageShell>
  )
}
