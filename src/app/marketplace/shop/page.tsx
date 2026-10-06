import type { Metadata } from "next"
import { fetchStoreProducts, fetchMarketBanners } from "@/lib/marketplace-products"
import { pageBannerOf } from "@/lib/marketplace-banners"
import { ProductListing } from "@/components/marketplace/product-listing"
import { StorePageShell, CollectionHero } from "@/components/marketplace/store-shell"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Shop All Products — TechPivo Market",
  description: "Browse every product on TechPivo Market — filter by price, color, size, rating and more.",
}

export default async function MarketplaceShopPage() {
  const [products, banners] = await Promise.all([
    fetchStoreProducts({ limit: 150 }),
    fetchMarketBanners(),
  ])
  return (
    <StorePageShell trail={[{ label: "Shop" }]}>
      <CollectionHero
        kicker="TechPivo Market"
        title="Shop All Products"
        copy="Every product in one place — use the filters to narrow by price, color, size, rating and features."
        image={pageBannerOf(banners, "shop_image")}
      />
      <ProductListing products={products} />
    </StorePageShell>
  )
}
