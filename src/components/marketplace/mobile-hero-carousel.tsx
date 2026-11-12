"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { marketImage } from "@/lib/marketplace-images"
import { type BannerSlide, type MarketBanners } from "@/lib/marketplace-banners"

/**
 * Mobile-only hero carousel — landscape promotional banners.
 *
 * Separate from the desktop hero: reads `mobile_hero_image` /
 * `mobile_hero_slides` from the banner settings. Falls back to the
 * desktop hero image when no mobile banner is uploaded.
 *
 * - 2:1 landscape aspect ratio (recommended 1200 × 600 px)
 * - Horizontal scroll-snap swipe carousel
 * - Auto-rotation with pagination dots
 * - Clickable banner destinations
 * - Rounded corners, no stretched images
 * - Hidden on desktop/tablet (md+)
 */
export function MobileHeroCarousel({ banners }: { banners: MarketBanners }) {
  const enabled = banners.mobile_hero_enabled !== false

  // Normalise slides: mobile cover first, then extra mobile slides.
  const slides = useMemo<BannerSlide[]>(() => {
    const out: BannerSlide[] = []
    const seen = new Set<string>()
    const cover = (banners.mobile_hero_image || "").trim()
    if (cover && !seen.has(cover)) {
      seen.add(cover)
      out.push({ image: cover, link: "" })
    }
    for (const s of Array.isArray(banners.mobile_hero_slides) ? banners.mobile_hero_slides : []) {
      const img = (s?.image || "").trim()
      if (img && !seen.has(img) && out.length < 10) {
        seen.add(img)
        out.push({ image: img, link: typeof s.link === "string" ? s.link : "" })
      }
    }
    // Fallback to desktop hero image when no mobile banner exists.
    if (out.length === 0) {
      const desktop = (banners.hero_image || "").trim()
      if (desktop) out.push({ image: desktop, link: "" })
    }
    return out
  }, [banners])

  const [index, setIndex] = useState(0)
  const [active, setActive] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const slideWidth = useMemo(() => {
    if (!containerRef.current) return 0
    return containerRef.current.clientWidth
  }, [])

  // Auto-rotate every 5 seconds.
  useEffect(() => {
    if (slides.length <= 1) return
    intervalRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, 5000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [slides.length])

  // Snap to nearest slide on scroll end.
  const onScrollEnd = useCallback(() => {
    const el = containerRef.current
    if (!el || slideWidth <= 0) return
    const next = Math.round(el.scrollLeft / slideWidth)
    setIndex(Math.max(0, Math.min(slides.length - 1, next)))
    setActive(Math.max(0, Math.min(slides.length - 1, next)))
  }, [slideWidth, slides.length])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener("scrollend", onScrollEnd)
    el.addEventListener("scroll", () => {
      const el2 = containerRef.current
      if (!el2) return
      setActive(Math.max(0, Math.min(slides.length - 1, Math.round(el2.scrollLeft / slideWidth))))
    })
    return () => {
      el.removeEventListener("scrollend", onScrollEnd)
    }
  }, [onScrollEnd, slideWidth, slides.length])

  const goTo = (i: number) => {
    setIndex(i)
    setActive(i)
    const el = containerRef.current
    if (!el) return
    const left = i * slideWidth
    el.scrollTo({ left, behavior: "smooth" })
  }

  if (!enabled || slides.length === 0) return null

  return (
    <section className="w-full mb-4">
      <div className="relative w-full overflow-hidden rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
        <div
          ref={containerRef}
          className="flex w-full snap-x scroll-smooth no-scrollbar"
          style={{ scrollbarWidth: "none" }}
        >
          {slides.map((s, i) => {
            const href = s.link ? cleanLink(s.link) : ""
            const image = marketImage(s.image)
            const isActive = i === active
            return (
              <div
                key={`mobile-hero-${i}`}
                className="flex-shrink-0 w-full min-w-[100%]"
              >
                {href ? (
                  <Link
                    href={href}
                    aria-label={`Banner ${i + 1}`}
                    className="block"
                  >
                    <div className="relative aspect-[2/1] w-full overflow-hidden rounded-2xl bg-slate-100 group">
                      <img
                        src={image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                    </div>
                  </Link>
                ) : (
                  <div className="relative aspect-[2/1] w-full overflow-hidden rounded-2xl bg-slate-100">
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute inset-0 bg-black/5" />
                  </div>
                )}
                {/* Single slide edge peek when multiple slides exist */}
                {slides.length > 1 && (
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-full pointer-events-none" />
                )}
              </div>
            )
          })}
        </div>

        {/* Pagination dots — only when more than one slide */}
        {slides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Slide ${i + 1}`}
                aria-current={i === active ? "true" : undefined}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === active
                    ? "bg-[#F59E0B] shadow-[0_0_0_4px_rgba(245,158,11,0.3)]"
                    : "bg-white/60 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/** Allow in-store paths, anchors, and https links — drop anything unsafe. */
function cleanLink(v: string): string {
  const t = v.trim()
  if (!t || /\s/.test(t)) return ""
  if (t === "/" || t.startsWith("#")) return t
  if (t.startsWith("/") && !t.startsWith("//")) return t
  if (/^https?:\/\//i.test(t)) return t
  return ""
}
