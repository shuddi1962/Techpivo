import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { MARKET_DEPARTMENTS } from "@/lib/marketplace-categories"
import { deptBannerOf, parseBanners } from "@/lib/marketplace-banners"
import { fetchStoreProducts } from "@/lib/marketplace-products"
import { ProductListing } from "@/components/marketplace/product-listing"
import { StorePageShell } from "@/components/marketplace/store-shell"
import { createClient } from "@/lib/supabase/server"

export const revalidate = 60

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

  const slugs =
    found.kind === "dept"
      ? [found.dept.slug, ...found.dept.subs.map((s) => s.slug)]
      : [found.sub!.slug]
  const products = await fetchStoreProducts({ slugs, limit: 150 })
  const title = found.kind === "dept" ? found.dept.name : found.sub!.name

  // Admin-custom banner (per-department override → default → built-in photo).
  let bannerImg = found.dept.image
  try {
    const supabase = await createClient()
    const { data } = await supabase.from("site_settings").select("value").eq("key", "marketplace_banners").maybeSingle()
    bannerImg = deptBannerOf(parseBanners((data as { value?: unknown } | null)?.value), found.dept.slug, found.dept.image)
  } catch {
    // anon read blocked or offline — built-in photo stays
  }

  return (
    <StorePageShell
      trail={
        found.kind === "sub"
          ? [
              { label: found.dept.name, href: `/marketplace/category/${found.dept.slug}` },
              { label: found.sub!.name },
            ]
          : [{ label: title }]
      }
    >
      {/* department banner */}
      <section className="relative overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bannerImg} alt={title} loading="eager" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(100deg, rgba(20,23,28,0.94) 20%, rgba(20,23,28,0.55) 55%, rgba(20,23,28,0.15) 100%)" }} />
        <div className="relative z-10 max-w-2xl space-y-2 p-6 sm:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#F59E0B]">
            {found.kind === "sub" ? found.dept.name : "Department"}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{title}</h1>
          <p className="text-sm text-white/80">
            {products.length} product{products.length === 1 ? "" : "s"} — quality-checked, securely paid, delivered with tracking.
          </p>
          {found.kind === "dept" && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {found.dept.subs.map((s) => (
                <Link
                  key={s.slug}
                  href={`/marketplace/category/${s.slug}`}
                  className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-[#0F172A]"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <ProductListing products={products} />
    </StorePageShell>
  )
}
