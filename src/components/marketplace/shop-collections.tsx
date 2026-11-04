"use client"

import Link from "next/link"
import { ChevronRight, ShoppingBag, LayoutGrid } from "lucide-react"
import { marketImage } from "@/lib/marketplace-images"

export interface CollectionItem {
  name: string
  slug: string
  href: string
  image: string
  subs?: Array<{ name: string; slug: string }>
}

// "Shop By Collections" — one tile per live-tree department. The cover
// routes to the department; subcategory chips beneath it route to their
// own category pages. Chips live OUTSIDE the cover link so both targets
// stay clickable.
export function ShopCollections({
  collections,
  seeAllHref = "/marketplace/shop",
}: {
  collections: CollectionItem[]
  seeAllHref?: string
}) {
  if (collections.length === 0) return null
  return (
    <section aria-label="Shop by collections" className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F59E0B]/10 text-[#F59E0B]">
            <ShoppingBag className="h-3.5 w-3.5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">Shop By Collections</h2>
            <p className="text-[11px] text-slate-500 font-medium">
              {collections.length} categories · shop by department
            </p>
          </div>
        </div>
        <Link
          href={seeAllHref}
          className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-bold uppercase tracking-wide text-slate-500 transition-colors hover:text-[#B45309]"
        >
          See all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {collections.map((c) => (
          <div key={c.slug} className="min-w-0 group">
            <Link
              href={c.href}
              aria-label={`View ${c.name} collection`}
              className="block min-w-0"
            >
              <span className="block relative aspect-[5/4] w-full overflow-hidden rounded-xl bg-[#F1F5F9] p-4 transition-all duration-300 group-hover:bg-[#E8EEF4] group-hover:-translate-y-1 group-hover:shadow-md">
                {c.image ? (
                  <img
                    src={marketImage(c.image)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-300">
                    <LayoutGrid className="h-6 w-6" />
                  </div>
                )}
                <span className="absolute bottom-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[#0F172A] shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <ShoppingBag className="h-4 w-4" />
                </span>
              </span>
            </Link>
            <div className="mt-2 flex justify-center">
              <Link
                href={c.href}
                title={c.name}
                className="max-w-full truncate text-center text-[13px] font-medium text-slate-700 transition-colors hover:text-[#B45309]"
              >
                {c.name}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
