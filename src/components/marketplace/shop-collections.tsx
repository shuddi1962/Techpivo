"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ChevronRight, ShoppingBag } from "lucide-react"
import { marketImage } from "@/lib/marketplace-images"
import { rotationBucket } from "@/lib/marketplace-rotation"

export interface CollectionItem {
  name: string
  slug: string
  href: string
  image: string
  subs?: Array<{ name: string; slug: string }>
  /** Admin-uploaded sidebar banner for this department: shown clean (no
      SALE overlay, text or button) as a vertical promo strip next to the
      department tile. Empty = no sidebar banner. */
  sideBanner?: string
  sideLink?: string
}

// "Shop By Collections" — one tile per live-tree department. The cover
// routes to the department. Shows 10 categories by default; tapping See
// All reveals all departments. No subcategory chips are rendered beneath
// the cards — only the category image and name.
// Rotates which departments lead the section every 10 minutes via a
// shared time bucket so all visitors see the same 10 during a window.
export function ShopCollections({
  collections,
  seeAllHref = "/marketplace/shop",
}: {
  collections: CollectionItem[]
  seeAllHref?: string
}) {
  const [showAll, setShowAll] = useState(false)

  // Time-based rotation: every 10 minutes the lead category changes so
  // all active categories get their turn at the front of the section.
  const bucket = rotationBucket()

  const ordered = useMemo(() => {
    if (collections.length <= 1) return collections
    const k = bucket % collections.length
    return [...collections.slice(k), ...collections.slice(0, k)]
  }, [collections, bucket])

  if (collections.length === 0) return null
  const visible = showAll ? ordered : ordered.slice(0, 10)

  return (
    <section aria-label="Shop by collections" className="bg-white rounded-2xl p-5 shadow-sm">
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
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-bold uppercase tracking-wide text-[#B45309] hover:text-[#F59E0B] transition-colors"
        >
          {showAll ? "See Less" : "See All"} <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {visible.map((c) => {
          const hasSide = Boolean(c.sideBanner?.trim())
          return (
            <div key={c.slug} className="min-w-0 group flex flex-col lg:flex-row items-start gap-3">
              {/* Department tile — square product/department image + name */}
              <div className="min-w-0">
                <Link
                  href={c.href}
                  aria-label={`View ${c.name} collection`}
                  className="block min-w-0"
                >
                  <span className="block relative aspect-[1/1] w-full overflow-hidden rounded-xl bg-[#F1F5F9] p-4 transition-all duration-300 group-hover:bg-[#E8EEF4] group-hover:-translate-y-1 group-hover:shadow-md">
                    {c.image ? (
                      <img
                        src={marketImage(c.image)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-300 rounded-xl">
                        <span className="text-xs font-medium text-slate-500">No image</span>
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
                    className="max-w-full line-clamp-2 text-center text-[13px] font-medium text-slate-700 transition-colors hover:text-[#B45309]"
                  >
                    {c.name}
                  </Link>
                </div>
              </div>
              {hasSide && (
                <Link
                  href={c.sideLink || c.href}
                  aria-label={`View ${c.name} promotion`}
                  className="hidden lg:flex-shrink-0 relative aspect-[2/3] w-[170px] overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] shadow-sm group"
                >
                  <img
                    src={marketImage(c.sideBanner!)}
                    alt={`${c.name} promotion`}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-contain bg-[#F8FAFC] group-hover:scale-105 transition-transform duration-300"
                  />
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
