"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronRight, LayoutGrid } from "lucide-react"
import { useMarketplaceTree } from "@/components/marketplace/market-category-store"
import type { MarketDepartment, MarketSub } from "@/lib/marketplace-categories"
import { marketImage } from "@/lib/marketplace-images"
import { fetchStoreProducts } from "@/lib/marketplace-products"
import { priceOf, type StoreProduct } from "@/lib/marketplace-catalog"

interface SubImageRotation {
  subSlug: string
  images: string[]
  index: number
}

interface MobileCategoryNavProps {
  onClose: () => void
}

const DEFAULT_ROTATION_INTERVAL_MS = 10_000

/**
 * Mobile-only category navigation — Temu-style split view.
 *
 * Left column: scrollable list of all major categories (departments).
 * Right column: scrollable grid of the selected category's subcategories,
 * each with a rotating real product image.
 *
 * Hidden on desktop/tablet via `md:hidden` — mounted only from the mobile
 * bottom nav "Categories" button.
 */
export function MobileCategoryNav({ onClose }: MobileCategoryNavProps) {
  const departments = useMarketplaceTree()
  const [selectedDept, setSelectedDept] = useState<MarketDepartment | null>(null)
  const [subImages, setSubImages] = useState<Map<string, string[]>>(
    new Map()
  )
  const [rotationIndex, setRotationIndex] = useState<Map<string, number>>(
    new Map()
  )
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(false)

  const intervalMs = DEFAULT_ROTATION_INTERVAL_MS

  // Build subcategory → product image map for the selected department.
  useEffect(() => {
    if (!selectedDept) {
      setSubImages(new Map())
      setRotationIndex(new Map())
      return
    }

    const load = async () => {
      const subs = selectedDept.subs
      const images = new Map<string, string[]>()
      const idx = new Map<string, number>()

      for (const sub of subs) {
        try {
          const products = await fetchStoreProducts({
            slugs: [sub.slug],
            limit: 8,
          })
          const imgs = products
            .filter((p) => p.product_image_url)
            .map((p) => p.product_image_url!)
          if (imgs.length > 0) {
            images.set(sub.slug, imgs)
            idx.set(sub.slug, 0)
          } else {
            // No products — fall back to department image or empty.
            images.set(sub.slug, [selectedDept.image])
            idx.set(sub.slug, 0)
          }
        } catch {
          images.set(sub.slug, [selectedDept.image])
          idx.set(sub.slug, 0)
        }
      }

      if (mountedRef.current) {
        setSubImages(images)
        setRotationIndex(idx)
      }
    }
    void load()
  }, [selectedDept, selectedDept?.subs, selectedDept?.image])

  // Auto-rotate subcategory images every intervalMs.
  useEffect(() => {
    if (!mountedRef.current || subImages.size === 0) return

    intervalRef.current = setInterval(() => {
      setRotationIndex((prev) => {
        const next = new Map(prev)
        let changed = false
        for (const [subSlug, imgs] of subImages) {
          if (imgs.length <= 1) continue
          const cur = next.get(subSlug) ?? 0
          next.set(subSlug, (cur + 1) % imgs.length)
          changed = true
        }
        return changed ? next : prev
      })
    }, intervalMs)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [subImages, intervalMs])

  // Pause rotation when the component is hidden.
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const subsForDept = useMemo(() => {
    if (!selectedDept) return []
    return selectedDept.subs
  }, [selectedDept])

  const activeSubImages = useMemo(() => {
    const map = new Map<string, string>()
    for (const sub of subsForDept) {
      const imgs = subImages.get(sub.slug)
      const idx = rotationIndex.get(sub.slug) ?? 0
      const list = imgs && imgs.length > 0 ? imgs : [selectedDept?.image ?? ""]
      map.set(sub.slug, list[Math.max(0, Math.min(idx, list.length - 1))])
    }
    return map
  }, [subsForDept, subImages, rotationIndex, selectedDept?.image])

  const deptList = useMemo(() => {
    return departments
  }, [departments])

  return (
    <div className="fixed inset-0 z-[70] bg-white flex flex-col md:hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] bg-white shrink-0">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close categories"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F8FAFC] text-[#0F172A]"
        >
          <LayoutGrid className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-[#0F172A]">Categories</h2>
        <div className="w-9 h-9" />
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* LEFT: Main categories sidebar */}
        <div className="w-[115px] border-r border-[#E2E8F0] bg-[#F8FAFC] overflow-y-auto shrink-0">
          <div className="py-2">
            {deptList.map((dept) => {
              const isActive = selectedDept?.slug === dept.slug
              return (
                <button
                  key={dept.slug}
                  type="button"
                  onClick={() => setSelectedDept(dept)}
                  aria-pressed={isActive}
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-[#FFF1F2] text-[#FF6B00]"
                      : "text-slate-700 hover:bg-[#F1F5F9]"
                  }`}
                >
                  <div className="w-5 h-5 shrink-0 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center">
                    {dept.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={marketImage(dept.image)}
                        alt=""
                        className="h-4 w-4 object-cover rounded-full"
                      />
                    ) : (
                      <span className="text-[10px]">{dept.name.charAt(0)}</span>
                    )}
                  </div>
                  <span className={`truncate ${isActive ? "font-semibold" : "font-medium"}`}>
                    {dept.name}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                </button>
              )
            })}
          </div>
        </div>

        {/* RIGHT: Subcategories grid */}
        <div className="flex-1 overflow-y-auto bg-white">
          {selectedDept ? (
            <div className="px-3 py-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-[#0F172A]">
                  {selectedDept.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {subsForDept.length} subcategories
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {subsForDept.map((sub) => {
                  const img = activeSubImages.get(sub.slug)
                  const hasRotating =
                    (subImages.get(sub.slug)?.length ?? 0) > 1
                  return (
                    <Link
                      key={sub.slug}
                      href={`/marketplace/category/${sub.slug}`}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-[#F1F5F9] group">
                        {img ? (
                          <img
                            src={marketImage(img)}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className={`w-full h-full object-cover transition-opacity duration-500 ${
                              hasRotating ? "group-hover:opacity-90" : ""
                            }`}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-300">
                            <span className="text-[10px]">
                              {sub.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        {hasRotating && (
                          <span className="absolute top-2 right-2 z-10 bg-[#FF6B00] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            NEW
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-[#0F172A] leading-tight text-center line-clamp-2">
                        {sub.name}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3">
                <LayoutGrid className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">Select a category</h3>
              <p className="text-sm text-slate-500 mt-1">
                Tap a category on the left to browse its subcategories.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
