"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { marketImage } from "@/lib/marketplace-images"

export interface CollectionItem {
  name: string
  slug: string
  href: string
  image: string
}

// "Shop By Collections" — every browsable category node (departments +
// subcategories) as a clean 6-column grid. Light-gray rectangular image
// blocks, object-contain imagery, centered names. No prices, no badges.
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
        <h2 className="text-lg font-bold text-[#0F172A]">Shop By Collections</h2>
        <Link
          href={seeAllHref}
          className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-bold uppercase tracking-wide text-slate-500 transition-colors hover:text-[#B45309]"
        >
          See all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {collections.map((c) => (
          <Link
            key={c.slug}
            href={c.href}
            aria-label={`View ${c.name} collection`}
            className="group block min-w-0"
          >
            <span className="block aspect-[5/4] w-full overflow-hidden rounded-xl bg-[#F1F5F9] p-4 transition-colors group-hover:bg-[#E8EEF4]">
              {c.image ? (
                <img
                  src={marketImage(c.image)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                />
              ) : null}
            </span>
            <span className="mt-2 block truncate text-center text-[13px] font-medium text-slate-700 transition-colors group-hover:text-[#B45309]" title={c.name}>
              {c.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
