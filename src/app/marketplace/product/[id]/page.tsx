import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { createPublicClient } from "@/lib/supabase/server"
import { fetchWithTimeout } from "@/lib/fetch-timeout"
import { MARKET_DEPARTMENTS } from "@/lib/marketplace-categories"
import { marketImage, cleanSupplierText } from "@/lib/marketplace-images"
import { supplierDisplayName } from "@/lib/marketplace"
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
  const metaRes = (await fetchWithTimeout(
    supabase
      .from("affiliate_products")
      .select("product_name,product_description,product_image_url")
      .eq("id", params.id)
      .eq("is_active", true)
      .maybeSingle(),
    8000
  )) as {
    data: { product_name: string; product_description: string | null; product_image_url: string | null } | null
  } | null
  const { data } = metaRes ?? { data: null }
  if (!data) return { title: "Product not found — TechPivo Market" }
  const cleanDesc = cleanSupplierText(data.product_description)
  const cleanImg = marketImage(data.product_image_url)
  return {
    title: `${cleanSupplierText(data.product_name) || data.product_name} — TechPivo Market`,
    description: (cleanDesc || `Buy ${data.product_name} on TechPivo Market with fast delivery.`).slice(0, 160),
    openGraph: cleanImg ? { images: [{ url: cleanImg }] } : undefined,
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
  const prodRes = (await fetchWithTimeout(
    supabase
      .from("affiliate_products")
      .select("id,product_name,product_description,product_image_url,original_price,sale_price,program_key,category_slug,subcategory_slug,stock,clicks,cj_data")
      .eq("id", params.id)
      .eq("is_active", true)
      .maybeSingle(),
    12000
  )) as { data: DbProduct | null; error: { message: string } | null } | null
  if (!prodRes) throw new Error("Marketplace product fetch timed out. Please try again.")
  const { data: product, error: productError } = prodRes
  if (productError) throw new Error(`Marketplace product fetch failed: ${productError.message}`)
  if (!product) notFound()
  // Never expose supplier internals to the storefront.
  const p = {
    ...product,
    program_key: supplierDisplayName(product.program_key),
    product_description: cleanSupplierText(product.product_description),
    product_image_url: marketImage(product.product_image_url),
  } as DbProduct

  const relatedQuery = supabase
    .from("affiliate_products")
    .select("id,product_name,product_image_url,original_price,sale_price,program_key")
    .eq("is_active", true)
    .neq("id", p.id)
    .order("created_at", { ascending: false })
    .limit(4)
  const rr = (await fetchWithTimeout(
    Promise.all([
      supabase
        .from("marketplace_reviews")
        .select("id,author_name,rating,title,comment,created_at")
        .eq("product_id", p.id)
        .order("created_at", { ascending: false })
        .limit(20),
      (p.category_slug ? relatedQuery.eq("category_slug", p.category_slug) : relatedQuery) as typeof relatedQuery,
    ]),
    10000
  )) as [
    { data: Array<{ id: string; author_name: string; rating: number; title: string | null; comment: string | null; created_at: string }> | null },
    { data: Array<{ id: string; product_name: string; product_image_url: string | null; original_price: number | null; sale_price: number | null; program_key: string | null }> | null },
  ] | null
  const reviews = rr?.[0]?.data ?? []
  const related = (rr?.[1]?.data ?? []).map((r) => ({
    ...r,
    program_key: supplierDisplayName(r.program_key),
    product_image_url: marketImage(r.product_image_url),
  }))

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
    brand: { "@type": "Brand", name: "TechPivo Market" },
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
      <MarketplaceHeader />
      <main className="mx-auto w-full max-w-[1400px] px-3 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
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
        <p className="text-center text-[11px] text-slate-400 px-4">
          Every order is quality-checked, securely paid and delivered with tracking — shop with confidence on TechPivo Market.
        </p>
      </main>
      <MarketplaceFooter />
    </div>
  )
}
