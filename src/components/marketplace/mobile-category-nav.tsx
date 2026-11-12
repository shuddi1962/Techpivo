"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { LayoutGrid } from "lucide-react"
import { useMarketplaceTree } from "@/components/marketplace/market-category-store"
import type { MarketDepartment, MarketSub } from "@/lib/marketplace-categories"
import { marketImage } from "@/lib/marketplace-images"

interface MobileCategoryNavProps {
  onClose: () => void
}

const DEFAULT_ROTATION_INTERVAL_MS = 600_000 // 10 minutes

/**
 * Mobile-only category navigation — Temu-style split view.
 *
 * Left column: scrollable list of all major categories (departments).
 *   Each department shows a REAL product image from that department,
 *   rotated every 10 minutes. No pixel/placeholder images, no arrows.
 * Right column: scrollable grid of the selected category's subcategories,
 *   each with a REAL product image from that subcategory, rotated every
 *   10 minutes. No fallback to department images — only real product
 *   images are shown.
 *
 * Hidden on desktop/tablet via `md:hidden`.
 */
export function MobileCategoryNav({ onClose }: MobileCategoryNavProps) {
  const departments = useMarketplaceTree()
  const [selectedDept, setSelectedDept] = useState<MarketDepartment | null>(
    null
  )
  // deptSlug -> image URLs (real products only)
  const [deptImages, setDeptImages] = useState<Map<string, string[]>>(
    new Map()
  )
  // deptSlug -> current rotation index
  const [deptRotation, setDeptRotation] = useState<Map<string, number>>(
    new Map()
  )
  // subSlug -> image URLs (real products only) — ALL departments pre-loaded
  const [subImages, setSubImages] = useState<Map<string, string[]>>(
    new Map()
  )
  // subSlug -> current rotation index
  const [subRotation, setSubRotation] = useState<Map<string, number>>(
    new Map()
  )
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(false)

  const intervalMs = DEFAULT_ROTATION_INTERVAL_MS

  // ---- Load ALL department images on mount ----
  useEffect(() => {
    const loadDeptImages = async () => {
      const images = new Map<string, string[]>()
      const idx = new Map<string, number>()

      await Promise.all(
        departments.map(async (dept) => {
          try {
            const res = await fetch(
              `/api/marketplace/department-images?slug=${encodeURIComponent(
                dept.slug
              )}`,
              { cache: "no-store" }
            )
            const data = await res.json().catch(() => null)
            const imgs = Array.isArray(data?.images) ? data.images : []
            if (imgs.length > 0) {
              images.set(dept.slug, imgs)
              idx.set(dept.slug, 0)
            }
          } catch {
            // silently skip
          }
        })
      )

      if (mountedRef.current) {
        setDeptImages(images)
        setDeptRotation(idx)
      }
    }
    void loadDeptImages()
  }, [departments])

  // ---- Load ALL subcategory images for ALL departments on mount ----
  // so clicking any department shows images instantly (no delay).
  useEffect(() => {
    const loadAllSubImages = async () => {
      const images = new Map<string, string[]>()
      const idx = new Map<string, number>()

      await Promise.all(
        departments.flatMap((dept) =>
          dept.subs.map(async (sub) => {
            try {
              const res = await fetch(
                `/api/marketplace/subcategory-images?slug=${encodeURIComponent(
                  sub.slug
                )}`,
                { cache: "no-store" }
              )
              const data = await res.json().catch(() => null)
              const imgs = Array.isArray(data?.images) ? data.images : []
              if (imgs.length > 0) {
                images.set(sub.slug, imgs)
                idx.set(sub.slug, 0)
              }
            } catch {
              // silently skip
            }
          })
        )
      )

      if (mountedRef.current) {
        setSubImages(images)
        setSubRotation(idx)
      }
    }
    void loadAllSubImages()
  }, [departments])

  // ---- Auto-rotate department images every intervalMs ----
  useEffect(() => {
    if (!mountedRef.current || deptImages.size === 0) return

    intervalRef.current = setInterval(() => {
      setDeptRotation((prev) => {
        const next = new Map(prev)
        let changed = false
        for (const [deptSlug, imgs] of deptImages) {
          if (imgs.length <= 1) continue
          const cur = next.get(deptSlug) ?? 0
          next.set(deptSlug, (cur + 1) % imgs.length)
          changed = true
        }
        return changed ? next : prev
      })
    }, intervalMs)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [deptImages, intervalMs])

  // ---- Auto-rotate subcategory images every intervalMs ----
  useEffect(() => {
    if (!mountedRef.current || subImages.size === 0) return

    intervalRef.current = setInterval(() => {
      setSubRotation((prev) => {
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

  // Pause rotation when hidden.
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

  // Current subcategory images (rotated).
  const activeSubImages = useMemo(() => {
    const map = new Map<string, string>()
    for (const sub of subsForDept) {
      const imgs = subImages.get(sub.slug)
      const idx = subRotation.get(sub.slug) ?? 0
      if (!imgs || imgs.length === 0) continue
      map.set(sub.slug, imgs[Math.max(0, Math.min(idx, imgs.length - 1))])
    }
    return map
  }, [subsForDept, subImages, subRotation])

  const deptList = useMemo(() => departments, [departments])

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
        {/* LEFT: Main categories sidebar — real product images per dept */}
        <div className="w-[115px] border-r border-[#E2E8F0] bg-[#F8FAFC] overflow-y-auto shrink-0">
          <div className="py-2">
            {deptList.map((dept) => {
              const isActive = selectedDept?.slug === dept.slug
              const imgs = deptImages.get(dept.slug)
              const deptIdx = deptRotation.get(dept.slug) ?? 0
              const currentImg =
                imgs && imgs.length > 0
                  ? imgs[Math.max(0, Math.min(deptIdx, imgs.length - 1))]
                  : null
              return (
                <button
                  key={dept.slug}
                  type="button"
                  onClick={() => setSelectedDept(dept)}
                  aria-pressed={isActive}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 transition-colors ${
                    isActive
                      ? "bg-[#FFF1F2] text-[#FF6B00]"
                      : "text-slate-700 hover:bg-[#F1F5F9]"
                  }`}
                >
                  <div className="relative w-9 h-9 shrink-0 overflow-hidden rounded-full bg-white border border-[#E2E8F0]">
                    {currentImg ? (
                      <img
                        src={marketImage(currentImg)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <span className="text-[9px]">
                          {dept.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className={`truncate text-[10px] leading-tight text-center ${
                    isActive ? "font-semibold" : "font-medium"
                  }`}>
                    {dept.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* RIGHT: Subcategories grid — real product images only */}
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
              {subsForDept.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3">
                    <LayoutGrid className="h-6 w-6 text-slate-400" />
                  </div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    No subcategories
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    No subcategories found for {selectedDept.name}.
                  </p>
                </div>
              ) : (
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
                        {img ? (
                          <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-white border border-[#E2E8F0] group">
                            <img
                              src={marketImage(img)}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className={`w-full h-full object-cover transition-opacity duration-500 ${
                                hasRotating ? "group-hover:opacity-90" : ""
                              }`}
                            />
                            {hasRotating && (
                              <span className="absolute top-2 right-2 z-10 bg-[#FF6B00] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                NEW
                              </span>
                            )}
                          </div>
                        ) : null}
                        <span className="text-[11px] font-medium text-[#0F172A] leading-tight text-center line-clamp-2">
                          {sub.name}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3">
                <LayoutGrid className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">
                Select a category
              </h3>
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
