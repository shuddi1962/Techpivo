"use client"

import Link from "next/link"
import { useMemo } from "react"
import { MARKET_DEPARTMENTS, type MarketDepartment } from "@/lib/marketplace-categories"
import { marketImage } from "@/lib/marketplace-images"
import { cn } from "@/lib/utils"

interface CategoryPick {
  name: string
  slug: string
  image: string
  href: string
}

/** Two existing subcategories pulled from the live tree — never invented. */
const MOBILE_SUBCATEGORY_PICKS: Array<{ dept: MarketDepartment; subName: string; subSlug: string }> = [
  { dept: MARKET_DEPARTMENTS[0], subName: "Smart Electronics", subSlug: "smart-electronics" },
  { dept: MARKET_DEPARTMENTS[1], subName: "Mobile Phones", subSlug: "mobile-phones" },
]

/**
 * Mobile-only Shop by Collections replacement.
 *
 * 16 category discovery items (14 departments + 2 subcategories) in a
 * 4-column grid. Each item is a circular image + name, clickable to its
 * category/subcategory listing page. Hidden on desktop/tablet.
 */
export function MobileCategoryDiscovery({ className }: { className?: string }) {
  const depts = MARKET_DEPARTMENTS

  const picks = useMemo<CategoryPick[]>(() => {
    const out: CategoryPick[] = []
    for (const d of depts) {
      out.push({
        name: d.name,
        slug: d.slug,
        image: d.image,
        href: `/marketplace/category/${d.slug}`,
      })
    }
    for (const p of MOBILE_SUBCATEGORY_PICKS) {
      out.push({
        name: p.subName,
        slug: p.subSlug,
        image: p.dept.image,
        href: `/marketplace/category/${p.dept.slug}/${p.subSlug}`,
      })
    }
    return out
  }, [depts])

  return (
    <section className={cn("bg-white mb-4", className)}>
      <div className="px-4 sm:px-6 lg:px-8 pb-2">
        <h2 className="text-lg font-bold text-[#0F172A] mb-3">
          All Your Essentials in One Place
        </h2>
      </div>
      <div className="px-4 sm:px-6 lg:px-8 pb-6">
        {/* 4 columns on mobile, expand gracefully on wider viewports */}
        <div className="grid grid-cols-4 gap-3 sm:gap-3 md:gap-4">
          {picks.map((c) => (
            <Link
              key={c.slug}
              href={c.href}
              aria-label={`Shop ${c.name}`}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className="relative block w-16 h-16 shrink-0 overflow-hidden rounded-full bg-[#F1F5F9] border border-[#E2E8F0] shadow-sm"
              >
                {c.image ? (
                  <img
                    src={marketImage(c.image)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <span className="text-xs font-medium">{c.name.charAt(0)}</span>
                  </div>
                )}
              </span>
              <span className="text-[11px] font-medium text-[#0F172A] leading-tight text-center line-clamp-2 max-w-[80px]">
                {c.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
