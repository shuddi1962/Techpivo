import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { createPublicClient } from "@/lib/supabase/server"
import { MARKET_DEPARTMENTS } from "@/lib/marketplace-categories"
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/marketplace-header"
import { ProductDetail } from "@/components/marketplace/product-detail"

export const revalidate = 60

interface DbProduct {
  id: string
  product_name: string
  product_description: string | null
  product_image_url: string | null
  original_price: number | null
  sale_price: number | null
  program_key: string | null
  category_slug: string | null
  subcategory_slug: string | null
  stock: number | null
  clicks: number | null
  cj_data: unknown
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createPublicClient()
  const { data } = await supabase
    .from("affiliate_products")
    .select("product_name,product_description,product_image_url")
    .eq("id", params.id)
    .eq("is_active", true)
    .maybeSingle()
  if (!data) return { title: "Product not found — TechPivo Market" }
  return {
    title: `${data.product_name} — TechPivo Market`,
    description: (data.product_description || `Buy ${data.product_name} on TechPivo Market with fast delivery.`).slice(0, 160),
    openGraph: data.product_image_url ? { images: [{ url: data.product_image_url }] } : undefined,
  }
}

function deptNameFor(slug: string | null): string | null {
  if (!slug) return null
  for (const d of MARKET_DEPARTMENTS) {
    if (d.slug === slug) return d.name
    if (d.subs.some((s) => s.slug === slug)) return d.name
  }
  return null
}

export default async function MarketplaceProductPage({ params }: { params: { id: string } }) {
  const supabase = createPublicClient()
  // A failed query must throw (500 + Try Again), never masquerade as a
  // missing product: the database can transiently fail under load, and a
  // 404 would be a lie for a product that exists.
  const { data: product, error: productError } = await supabase
    .from("affiliate_products")
    .select("id,product_name,product_description,product_image_url,original_price,sale_price,program_key,category_slug,subcategory_slug,stock,clicks,cj_data")
    .eq("id", params.id)
    .eq("is_active", true)
    .maybeSingle()
  if (productError) throw new Error(`Marketplace product fetch failed: ${productError.message}`)
  if (!product) notFound()
  const p = product as DbProduct

  const relatedQuery = supabase
    .from("affiliate_products")
    .select("id,product_name,product_image_url,original_price,sale_price,program_key")
    .eq("is_active", true)
    .neq("id", p.id)
    .order("created_at", { ascending: false })
    .limit(4)
  const [{ data: reviews }, { data: related }] = await Promise.all([
    supabase
      .from("marketplace_reviews")
      .select("id,author_name,rating,title,comment,created_at")
      .eq("product_id", p.id)
      .order("created_at", { ascending: false })
      .limit(20),
    (p.category_slug ? relatedQuery.eq("category_slug", p.category_slug) : relatedQuery) as typeof relatedQuery,
  ])

  const deptSlug =
    MARKET_DEPARTMENTS.find(
      (d) => d.slug === p.category_slug || d.subs.some((s) => s.slug === (p.subcategory_slug || p.category_slug))
    )?.slug ?? null
  const deptName = deptNameFor(p.subcategory_slug || p.category_slug)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.product_name,
    description: p.product_description || undefined,
    image: p.product_image_url || undefined,
    brand: { "@type": "Brand", name: p.program_key || "TechPivo Market" },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: Number(p.sale_price ?? p.original_price ?? 0),
      availability: "https://schema.org/InStock",
    },
  }

  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="px-3 sm:px-6 lg:px-10 py-4 space-y-4">
        <MarketplaceHeader />
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-slate-500 flex-wrap">
          <Link href="/marketplace" className="hover:text-[#0F172A]">Home</Link>
          <ChevronRight className="h-3 w-3" />
          {deptSlug ? (
            <>
              <Link href={`/marketplace/category/${deptSlug}`} className="hover:text-[#0F172A]">{deptName || "Category"}</Link>
              <ChevronRight className="h-3 w-3" />
            </>
          ) : null}
          <span className="text-[#0F172A] font-medium line-clamp-1 max-w-[60vw]">{p.product_name}</span>
        </nav>
        <ProductDetail product={p} reviews={reviews || []} related={related || []} deptSlug={deptSlug} />
        <MarketplaceFooter />
        <p className="text-center text-[11px] text-slate-400 px-4 pb-2">
          TechPivo Market contains affiliate links. When you buy through links on this page, we may earn a commission — it never affects our reviews.
        </p>
      </div>
    </div>
  )
}
