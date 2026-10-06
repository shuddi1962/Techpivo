// TechPivo Market storefront data (SERVER ONLY — uses the public client).
// Every product leaving this module is sanitized: neutral supplier label,
// cleaned copy, proxied images — no supplier internals ever reach the page.
import { createPublicClient } from "@/lib/supabase/server"
import { fetchWithTimeout } from "@/lib/fetch-timeout"
import { supplierDisplayName } from "@/lib/marketplace"
import { marketImage, cleanSupplierText } from "@/lib/marketplace-images"
import type { StoreProduct } from "@/lib/marketplace-catalog"
import type { MarketBanners } from "@/lib/marketplace-banners"

export type { StoreProduct } from "@/lib/marketplace-catalog"

interface RawProduct {
  id: string
  product_name: string
  product_description: string | null
  product_image_url: string | null
  original_price: number | null
  sale_price: number | null
  program_key: string | null
  is_featured: boolean
  stock: number | null
  clicks: number | null
  created_at: string | null
  category_slug: string | null
  subcategory_slug: string | null
}

const COLS =
  "id,product_name,product_description,product_image_url,original_price,sale_price,program_key,is_featured,stock,clicks,created_at,category_slug,subcategory_slug"

function sanitize(p: RawProduct, rating: number, reviews: number): StoreProduct {
  return {
    id: p.id,
    product_name: cleanSupplierText(p.product_name) || p.product_name,
    product_description: cleanSupplierText(p.product_description),
    product_image_url: marketImage(p.product_image_url),
    original_price: p.original_price,
    sale_price: p.sale_price,
    program_key: supplierDisplayName(p.program_key),
    is_featured: !!p.is_featured,
    stock: p.stock,
    clicks: p.clicks,
    created_at: p.created_at,
    category_slug: p.category_slug,
    subcategory_slug: p.subcategory_slug,
    rating,
    reviews,
  }
}

export async function fetchStoreProducts(opts?: {
  slugs?: string[]
  order?: "newest" | "popular"
  limit?: number
  timeoutMs?: number
}): Promise<StoreProduct[]> {
  const supabase = createPublicClient()
  const timeout = opts?.timeoutMs ?? 10000
  let q = supabase.from("affiliate_products").select(COLS).eq("is_active", true)
  if (opts?.slugs && opts.slugs.length > 0) {
    const list = opts.slugs.join(",")
    q = q.or(`category_slug.in.(${list}),subcategory_slug.in.(${list})`)
  }
  if (opts?.order === "popular") q = q.order("clicks", { ascending: false, nullsFirst: false })
  else q = q.order("created_at", { ascending: false })
  q = q.limit(Math.min(opts?.limit ?? 100, 200))

  const [prodRes, revRes] = await Promise.all([
    fetchWithTimeout(q, timeout) as Promise<{ data: RawProduct[] | null; error: { message: string } | null } | null>,
    fetchWithTimeout(
      supabase.from("marketplace_reviews").select("product_id,rating").limit(2000),
      timeout
    ) as Promise<{ data: Array<{ product_id: string; rating: number }> | null } | null>,
  ])
  if (!prodRes) throw new Error("Marketplace catalog fetch timed out. Please try again.")
  if (prodRes.error) throw new Error(`Marketplace catalog fetch failed: ${prodRes.error.message}`)
  const stats = new Map<string, { sum: number; n: number }>()
  for (const r of revRes?.data || []) {
    const cur = stats.get(r.product_id) || { sum: 0, n: 0 }
    cur.sum += Number(r.rating) || 0
    cur.n += 1
    stats.set(r.product_id, cur)
  }
  return ((prodRes.data || []) as RawProduct[]).map((p) => {
    const st = stats.get(p.id)
    return sanitize(p, st && st.n > 0 ? st.sum / st.n : 0, st?.n ?? 0)
  })
}

// Admin-custom storefront banners (public site_settings read). Never
// throws — pages fall back to EMPTY_BANNERS (gradient heroes) instead.
export async function fetchMarketBanners(): Promise<MarketBanners> {
  const { EMPTY_BANNERS, parseBanners } = await import("@/lib/marketplace-banners")
  try {
    const supabase = createPublicClient()
    const res = (await fetchWithTimeout(
      supabase.from("site_settings").select("value").eq("key", "marketplace_banners").maybeSingle(),
      8000
    )) as { data: { value?: unknown } | null } | null
    return parseBanners(res?.data?.value)
  } catch {
    return { ...EMPTY_BANNERS, departments: {} }
  }
}
