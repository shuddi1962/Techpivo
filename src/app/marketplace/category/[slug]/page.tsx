import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { MarketDepartment } from "@/lib/marketplace-categories"
import { fetchMarketplaceTree } from "@/lib/marketplace-category-db"
import { deptBannerOf, linkOf } from "@/lib/marketplace-banners"
import { fetchStoreProducts, fetchMarketBanners, fetchMarketMerch } from "@/lib/marketplace-products"
import { ProductListing } from "@/components/marketplace/product-listing"
import { StorePageShell } from "@/components/marketplace/store-shell"

export const revalidate = 60

// The store mirrors CJ's own three-level tree: department -> subcategory ->
// leaf. Every level has its own page.
type Resolved =
  | { kind: "dept"; dept: MarketDepartment; sub: null; leaf: null }
  | { kind: "sub"; dept: MarketDepartment; sub: { name: string; slug: string }; leaf: null }
  | {
      kind: "leaf"
      dept: MarketDepartment
      sub: { name: string; slug: string }
      leaf: { name: string; slug: string }
    }

function resolveCategory(slug: string, departments: MarketDepartment[]): Resolved | null {
  for (const d of departments) {
    if (d.slug === slug) return { kind: "dept", dept: d, sub: null, leaf: null }
    for (const s of d.subs) {
      if (s.slug === slug) return { kind: "sub", dept: d, sub: { name: s.name, slug: s.slug }, leaf: null }
      const leaf = s.items.find((i) => i.slug === slug)
      if (leaf) {
        return {
          kind: "leaf",
          dept: d,
          sub: { name: s.name, slug: s.slug },
          leaf: { name: leaf.name, slug: leaf.slug },
        }
      }
    }
  }
  return null
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const found = resolveCategory(params.slug, await fetchMarketplaceTree())
  if (!found) return { title: "Category not found — TechPivo Market" }
  const name =
    found.kind === "dept"
      ? found.dept.name
      : found.kind === "sub"
        ? `${found.sub.name} — ${found.dept.name}`
        : `${found.leaf.name} — ${found.sub.name} — ${found.dept.name}`
  return {
    title: `${name} — TechPivo Market`,
    description: `Shop ${name} on TechPivo Market — curated products with fast tracked delivery and secure checkout.`,
  }
}

export default async function MarketplaceCategoryPage({ params }: { params: { slug: string } }) {
  const found = resolveCategory(params.slug, await fetchMarketplaceTree())
  if (!found) notFound()

  // A leaf page shows exactly that leaf; a subcategory page shows the whole
  // subcategory; a department page shows everything inside it.
  const slugs =
    found.kind === "dept"
      ? [found.dept.slug, ...found.dept.subs.map((s) => s.slug)]
      : found.kind === "sub"
        ? [found.sub.slug]
        : []
  const leafSlugs = found.kind === "leaf" ? [found.leaf.slug] : undefined
  const [products, banners, merchState] = await Promise.all([
    fetchStoreProducts({ slugs, leafSlugs, limit: 150 }),
    fetchMarketBanners(),
    fetchMarketMerch(),
  ])
  const title =
    found.kind === "dept" ? found.dept.name : found.kind === "sub" ? found.sub.name : found.leaf.name

  // Hero imagery: admin upload wins (per-department → default). Otherwise
  // the hero is built from THIS category's own live product photos — never
  // a generic stock photo. No products + no upload = gradient-only hero.
  const uploadedBanner = deptBannerOf(banners, found.dept.slug, "")
  const heroShots = products
    .flatMap((p) => (p.product_image_url ? [{ id: p.id, name: p.product_name, url: p.product_image_url }] : []))
    .slice(0, 4)

  return (
    <StorePageShell
      trail={
        found.kind === "sub"
          ? [
              { label: found.dept.name, href: `/marketplace/category/${found.dept.slug}` },
              { label: found.sub.name },
            ]
          : found.kind === "leaf"
            ? [
                { label: found.dept.name, href: `/marketplace/category/${found.dept.slug}` },
                { label: found.sub.name, href: `/marketplace/category/${found.sub.slug}` },
                { label: found.leaf.name },
              ]
            : [{ label: title }]
      }
    >
      {/* category hero — clean modern band with department name + subcategory chips */}
      <section className="relative overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-sm">
        {uploadedBanner ? (
          <>
            {(() => {
              const dest = linkOf(banners, uploadedBanner)
              const img = (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={uploadedBanner} alt={title} loading="eager" decoding="async" className="block h-auto w-full" />
              )
              return dest ? (
                <Link href={dest} aria-label={title} className="block">{img}</Link>
              ) : img
            })()}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/95 via-[#0F172A]/40 to-transparent" />
            <div className="absolute inset-0" />
            <div className="relative z-20 p-4 sm:p-6">
              <div className="mb-3 flex flex-wrap gap-1">
                {found.kind === "dept" && (
                  <div className="flex flex-wrap gap-1">
                    {found.dept.subs.map((s) => (
                      <Link
                        key={s.slug}
                        href={`/marketplace/category/${s.slug}`}
                        className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-0.5 text-xs font-semibold text-slate-700 backdrop-blur-sm transition-colors hover:bg-white hover:text-[#FF6B00] hover:border-[#FF6B00]"
                      >
                        {s.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF6B00]">
                {found.kind === "sub" ? found.dept.name : "Department"}
              </p>
              <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-white sm:text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{title}</h1>
              <p className="mt-0.5 text-sm text-white/90">
                Quality-checked, securely paid, delivered with tracking.
              </p>
            </div>
          </>
        ) : (
          <div className="p-4 sm:p-6" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1e293b 60%, #334155 100%)" }}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF6B00]">
                  {found.kind === "sub" ? found.dept.name : "Department"}
                </p>
              <h1 className="mt-0 text-xl font-extrabold tracking-tight text-white sm:text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{title}</h1>
              <p className="mt-0.5 text-sm text-white/90">
                Quality-checked, securely paid, delivered with tracking.
              </p>
              {found.kind === "dept" && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {found.dept.subs.map((s) => (
                    <Link
                      key={s.slug}
                      href={`/marketplace/category/${s.slug}`}
                      className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-0.5 text-xs font-semibold text-slate-700 backdrop-blur-sm transition-colors hover:bg-white hover:text-[#FF6B00] hover:border-[#FF6B00]"
                    >
                      {s.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {heroShots.length > 0 && (
              <div className="flex shrink-0 gap-2" aria-hidden={false}>
                {heroShots.map((p) => (
                  <Link
                    key={p.id}
                    href={`/marketplace/product/${p.id}`}
                    title={p.name}
                    aria-label={`View ${p.name}`}
                    className="block h-20 w-20 overflow-hidden rounded-xl border border-white/20 bg-white/5 transition-transform hover:scale-105 sm:h-24 sm:w-24"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" loading="eager" decoding="async" className="h-full w-full object-cover" />
                  </Link>
                ))}
              </div>
            )}
            </div>
          </div>
        )}
      </section>

      <ProductListing products={products} initialMerch={merchState} />
    </StorePageShell>
  )
}
