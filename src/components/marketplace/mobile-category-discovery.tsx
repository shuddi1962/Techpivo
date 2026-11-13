"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useMarketplaceTree } from "./market-category-store"
import { marketImage } from "@/lib/marketplace-images"
import { cn } from "@/lib/utils"

const ROTATE_MS = 600_000 // 10 minutes
const MAX_TILES = 16

interface CategoryPick {
  key: string
  name: string
  slug: string
  href: string
  /** "dept" tiles read the department feed, "sub" tiles the subcategory feed. */
  kind: "dept" | "sub"
}

/**
 * Mobile-only Shop by Collections replacement.
 *
 * 16 category discovery tiles (live departments first, topped up with live
 * subcategories) in a 4-column grid. Every tile shows a REAL product photo
 * from the catalogue for that exact category — never a stock or placeholder
 * image. If a category genuinely has no product photo the tile shows a letter
 * chip, never a fake picture.
 *
 * Photos rotate every 10 minutes: each category keeps a list of real product
 * images and the grid advances to the next one on a fixed interval.
 */
export function MobileCategoryDiscovery({
  className,
  covers,
}: {
  className?: string
  /** slug -> real product image URLs for that category (instant first paint). */
  covers?: Map<string, string[]>
}) {
  const departments = useMarketplaceTree()
  const [fetched, setFetched] = useState<Map<string, string[]>>(new Map())
  const [rot, setRot] = useState(0)

  // Department tiles first, topped up with real subcategories so the grid
  // always fills — both come from the LIVE tree, never hardcoded.
  const picks = useMemo<CategoryPick[]>(() => {
    const out: CategoryPick[] = []
    for (const d of departments) {
      if (out.length >= MAX_TILES) break
      out.push({
        key: `dept-${d.slug}`,
        name: d.name,
        slug: d.slug,
        href: `/marketplace/category/${d.slug}`,
        kind: "dept",
      })
    }
    for (const d of departments) {
      for (const s of d.subs || []) {
        if (out.length >= MAX_TILES) break
        if (out.some((p) => p.slug === s.slug)) continue
        out.push({
          key: `sub-${s.slug}`,
          name: s.name,
          slug: s.slug,
          href: `/marketplace/category/${d.slug}/${s.slug}`,
          kind: "sub",
        })
      }
    }
    return out
  }, [departments])

  // Fill any tile the server-provided map could not resolve with a direct
  // lookup, so every category ends up with a REAL product photo. Each slug
  // is attempted exactly once — a category with no product photo simply
  // keeps its letter chip instead of retrying forever.
  const [attempted, setAttempted] = useState<Set<string>>(new Set())

  const missingKey = useMemo(
    () =>
      picks
        .filter((p) => {
          if (attempted.has(p.slug)) return false
          const seeded = covers?.get(p.slug)
          return !seeded || seeded.length === 0
        })
        .map((p) => `${p.kind}:${p.slug}`)
        .join(","),
    [picks, covers, attempted]
  )

  useEffect(() => {
    if (!missingKey) return
    const missing = missingKey.split(",").map((k) => {
      const [kind, slug] = k.split(":")
      return { kind: kind as "dept" | "sub", slug }
    })
    let alive = true
    const load = async () => {
      const results = await Promise.all(
        missing.map(async (p) => {
          const endpoint =
            p.kind === "dept" ? "department-images" : "subcategory-images"
          try {
            const res = await fetch(
              `/api/marketplace/${endpoint}?slug=${encodeURIComponent(p.slug)}`,
              { cache: "no-store" }
            )
            const data = await res.json().catch(() => null)
            const imgs = Array.isArray(data?.images) ? data.images : []
            return [p.slug, imgs] as const
          } catch {
            return [p.slug, [] as string[]] as const
          }
        })
      )
      if (!alive) return
      const map = new Map<string, string[]>()
      for (const [slug, imgs] of results) {
        if (imgs.length > 0) map.set(slug, imgs)
      }
      setFetched(map)
      setAttempted((prev) => {
        const next = new Set(prev)
        for (const p of missing) next.add(p.slug)
        return next
      })
    }
    void load()
    return () => {
      alive = false
    }
  }, [missingKey])

  // Advance the rotation every 10 minutes.
  useEffect(() => {
    const t = setInterval(() => setRot((r) => r + 1), ROTATE_MS)
    return () => clearInterval(t)
  }, [])

  const currentFor = (p: CategoryPick): string => {
    const list = fetched.get(p.slug) || covers?.get(p.slug)
    if (!list || list.length === 0) return ""
    return list[rot % list.length] || ""
  }

  return (
    <section
      className={cn("bg-white rounded-2xl p-4 sm:p-5 shadow-sm", className)}
    >
      <div className="pb-1">
        <h2 className="text-lg font-bold text-[#0F172A] mb-3">
          All Your Essentials in One Place
        </h2>
      </div>
      <div className="pb-1">
        {/* 4 columns on mobile, expand gracefully on wider viewports.
            Tiles stay compact so circles always sit on the same line and
            every category gets a real product photo (or a letter chip). */}
              <div className="grid grid-cols-4 gap-2 sm:gap-2 md:gap-3 align-stretch">
            {picks.map((c) => {
            const image = currentFor(c)
            return (
              <Link
                key={c.key}
                href={c.href}
                aria-label={`Shop ${c.name}`}
                className="flex flex-col items-center justify-center gap-1 h-full min-h-[120px]"
              >
                <span className="relative block w-14 h-14 shrink-0 overflow-hidden rounded-full bg-[#F1F5F9] border border-[#E2E8F0] shadow-sm flex-shrink-0">
                  {image ? (
                    <img
                      src={marketImage(image)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <span className="text-[10px] font-semibold">
                        {c.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </span>
                <span className="min-w-0 text-[10px] font-medium text-[#0F172A] leading-none text-center line-clamp-1 whitespace-nowrap truncate max-w-[64px]">
                  {c.name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
