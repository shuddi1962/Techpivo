import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { createPublicClient } from "@/lib/supabase/server"
import { fetchWithTimeout } from "@/lib/fetch-timeout"
import { MARKET_DEPARTMENTS } from "@/lib/marketplace-categories"
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/marketplace-header"
import { CategoryBrowse } from "@/components/marketplace/category-browse"

export const revalidate = 60

export interface CatProduct {
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
}

function resolveCategory(slug: string) {
  for (const d of MARKET_DEPARTMENTS) {
    if (d.slug === slug) return { kind: "dept" as const, dept: d, sub: null as null | { name: string; slug: string } }
    const sub = d.subs.find((s) => s.slug === slug)
    if (sub) return { kind: "sub" as const, dept: d, sub }
  }
  return null
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const found = resolveCategory(params.slug)
  if (!found) return { title: "Category not found — TechPivo Market" }
  const name = found.kind === "dept" ? found.dept.name : `${found.sub!.name} — ${found.dept.name}`
  return {
    title: `${name} — TechPivo Market`,
    description: `Shop ${name} on TechPivo Market — curated tech products with fast tracked delivery and secure checkout.`,
  }
}

export default async function MarketplaceCategoryPage({ params }: { params: { slug: string } }) {
  const found = resolveCategory(params.slug)
  if (!found) notFound()

  const supabase = createPublicClient()
  const slugs =
    found.kind === "dept"
      ? [found.dept.slug, ...found.dept.subs.map((s) => s.slug)]
      : [found.sub!.slug]

  const catRes = (await fetchWithTimeout(
    supabase
      .from("affiliate_products")
      .select("id,product_name,product_description,product_image_url,original_price,sale_price,program_key,is_featured,stock,clicks,created_at")
      .eq("is_active", true)
      .or(`category_slug.in.(${slugs.join(",")}),subcategory_slug.in.(${slugs.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(100),
    10000
  )) as { data: CatProduct[] | null; error: { message: string } | null } | null
  // Same rule as the product page: a failed query throws (500 + Try Again)
  // instead of pretending the department is empty.
  if (!catRes) throw new Error("Marketplace category fetch timed out. Please try again.")
  const { data, error } = catRes
  if (error) throw new Error(`Marketplace category fetch failed: ${error.message}`)

  const products = (data || []) as CatProduct[]
  const title = found.kind === "dept" ? found.dept.name : found.sub!.name

  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen">
      <div className="px-3 sm:px-6 lg:px-10 py-4 space-y-4">
        <MarketplaceHeader />
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-slate-500 flex-wrap">
          <Link href="/marketplace" className="hover:text-[#0F172A]">Home</Link>
          <ChevronRight className="h-3 w-3" />
          {found.kind === "sub" ? (
            <>
              <Link href={`/marketplace/category/${found.dept.slug}`} className="hover:text-[#0F172A]">{found.dept.name}</Link>
              <ChevronRight className="h-3 w-3" />
            </>
          ) : null}
          <span className="text-[#0F172A] font-medium">{title}</span>
        </nav>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">{title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {products.length} product{products.length === 1 ? "" : "s"} found
            {found.kind === "dept" ? ` across ${found.dept.subs.length} groups` : ` in ${found.dept.name}`}
          </p>
        </div>
        <CategoryBrowse products={products} deptSlug={found.dept.slug} subs={found.dept.subs.map((s) => ({ name: s.name, slug: s.slug }))} />
        <MarketplaceFooter />
      </div>
    </div>
  )
}
