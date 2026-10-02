// TechPivo Market catalog types + pure price helpers (CLIENT-SAFE —
// no server imports here; server fetching lives in marketplace-products.ts).
export interface StoreProduct {
  id: string
  product_name: string
  product_description: string | null
  product_image_url: string | null
  original_price: number | null
  sale_price: number | null
  program_key: string
  is_featured: boolean
  stock: number | null
  clicks: number | null
  created_at: string | null
  category_slug: string | null
  subcategory_slug: string | null
  rating: number
  reviews: number
}

export function priceOf(p: StoreProduct): number {
  return Number(p.sale_price ?? p.original_price ?? 0)
}

export function discountOf(p: StoreProduct): number {
  const price = priceOf(p)
  const old = p.original_price ? Number(p.original_price) : NaN
  return Number.isFinite(old) && old > price ? 1 - price / old : 0
}
