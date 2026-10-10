import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { MARKET_DEPARTMENTS } from "@/lib/marketplace-categories"
import { fetchStoreProducts, fetchMarketBanners } from "@/lib/marketplace-products"
import { pageBannerOf } from "@/lib/marketplace-banners"
import { StorePageShell, CollectionHero } from "@/components/marketplace/store-shell"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Top Stores — TechPivo Market",
  description: "Browse TechPivo Market stores by department — curated tech in every aisle.",
}

export default async function MarketplaceTopStoresPage() {
  const [products, banners] = await Promise.all([
    fetchStoreProducts({ limit: 150 }),
    fetchMarketBanners(),
  ])

  // Real product photos per store — never generic stock. A store card
  // shows its own live catalog photo; a store with no live products yet
  // gets a branded gradient placeholder instead.
  const inDept = (deptSlug: string, subSlugs: string[], cat: string | null, sub: string | null) =>
    (cat !== null && (cat === deptSlug || subSlugs.includes(cat))) ||
    (sub !== null && (sub === deptSlug || subSlugs.includes(sub)))
  const coverOf = (deptSlug: string, subs: Array<{ slug: string }>): string => {
    const subSlugs = subs.map((s) => s.slug)
    const hit = products.find((p) =>
      inDept(deptSlug, subSlugs, p.category_slug, p.subcategory_slug) && p.product_image_url
    )
    return hit?.product_image_url || ""
  }

  return (
    <StorePageShell trail={[{ label: "Top Stores" }]}>
      <CollectionHero
        kicker="Every aisle, curated"
        title="Top Stores"
        copy="Pick a store to browse its full range — every product quality-checked with tracked delivery."
        theme="orange"
        image={pageBannerOf(banners, "top_stores_image")}
        links={banners.links}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MARKET_DEPARTMENTS.map((d) => {
          const cover = coverOf(d.slug, d.subs)
          return (
          <Link
            key={d.slug}
            href={`/marketplace/category/${d.slug}`}
            className="group overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="relative h-44 overflow-hidden bg-[#23272E]">
              {cover ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cover} alt={d.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center" style={{ background: "linear-gradient(120deg, #23272E 0%, #14171C 100%)" }}>
                  <span className="text-4xl font-extrabold text-white/20">{d.name.charAt(0)}</span>
                </div>
              )}
              <h2 className="absolute bottom-3 left-4 right-4 text-xl font-extrabold text-white">{d.name}</h2>
            </div>
            <div className="flex flex-wrap gap-1.5 p-4">
              {d.subs.slice(0, 4).map((s) => (
                <span key={s.slug} className="rounded-full bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 text-[11px] font-medium text-slate-600">
                  {s.name}
                </span>
              ))}
              <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-[#DC2626]">
                Shop now <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </Link>
          )
        })}
      </div>
    </StorePageShell>
  )
}
