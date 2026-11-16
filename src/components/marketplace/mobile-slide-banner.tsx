"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { marketImage } from "@/lib/marketplace-images"
import { cn } from "@/lib/utils"
import { type BannerSlide, type MarketBanners } from "@/lib/marketplace-banners"

/**
 * NEW MOBILE SLIDE BANNER — homepage hero replacement.
 *
 * Renders flush against the header (zero top space) as a full-width slide
 * carousel. Built entirely for mobile; hidden on desktop/tablet (md+).
 *
 * Slide source chain:
 *   1. banners.mobile_hero_image  (single cover)
 *   2. banners.mobile_hero_slides  (extra slides)
 *   3. banners.hero_image          (desktop fallback)
 *   4. MARKETPLACE_HERO.image      (hardcoded fallback)
 *
 * Every slide carries its own destination link from the admin banner data.
 */
export function MobileSlideBanner({
  className,
  banners,
}: {
  className?: string
  banners: MarketBanners
}) {
  const enabled = banners.mobile_hero_enabled !== false

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
        out.push({
          image: img,
          link: typeof s.link === "string" ? s.link : "",
        })
      }
    }

    // Desktop hero image fallback when no mobile banner is configured.
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

  // Auto-rotate every 6 seconds.
  useEffect(() => {
    if (slides.length <= 1) return
    intervalRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, 6000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [slides.length])

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
    <section
      className={cn(
        "w-full overflow-x-clip mt-0 mb-0 pt-0 pb-0",
        "md:hidden",
        className
      )}
      style={{ marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
    >
      <div className="relative w-full overflow-hidden bg-[#F8FAFC]">
        <div
          ref={containerRef}
          className="flex w-full snap-x snap-mandatory scroll-smooth overflow-x-auto overflow-y-hidden no-scrollbar"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          {slides.map((s, i) => {
            const href = s.link ? cleanLink(s.link) : ""
            const image = marketImage(s.image)
            const isActive = i === active
            return (
              <div
                key={`mobile-slide-${i}`}
                className="flex-shrink-0 w-full snap-center"
              >
                {href ? (
                  <Link
                    href={href}
                    aria-label={`Banner ${i + 1}`}
                    className="block"
                  >
                    <div className="relative aspect-[2/1] w-full overflow-hidden bg-[#F8FAFC] group">
                      <img
                        src={image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                    </div>
                  </Link>
                ) : (
                  <div className="relative aspect-[2/1] w-full overflow-hidden bg-[#F8FAFC]">
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-contain"
                    />
                    <span className="absolute inset-0 bg-black/5" />
                  </div>
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
                    ? "bg-[#FF6B00] shadow-[0_0_0_4px_rgba(255,107,0,0.3)]"
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
