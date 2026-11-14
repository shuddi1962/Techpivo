"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { marketImage } from "@/lib/marketplace-images"
import { type MobileBanner } from "@/lib/marketplace-mobile-banners"

/**
 * Mobile-only homepage banner carousel.
 *
 * Reads the admin-configured mobile banner list (site_settings key
 * `marketplace_mobile_banners`) — entirely independent of the desktop banner
 * system, so desktop keeps showing its existing desktop banners untouched.
 *
 * - Swipe left / right (scroll-snap)
 * - Proper slide indicators (dots)
 * - Smooth auto-rotation
 * - Responsive image sizing, no partially visible slides, no overflow
 * - Full-bleed edge to edge under the header
 * - Hidden on desktop/tablet (md+)
 */
export function MobileBanners({ className }: { className?: string }) {
  const [banners, setBanners] = useState<MobileBanner[]>([])
  const [active, setActive] = useState(0)
  const [index, setIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const slideWidth = useRef(0)

  useEffect(() => {
    let alive = true
    fetch("/api/marketplace/mobile-banners")
      .then((r) => r.json().catch(() => ({ banners: [] })))
      .then((d) => {
        if (!alive) return
        const list = Array.isArray(d?.banners) ? (d.banners as MobileBanner[]) : []
        setBanners(list)
      })
    return () => {
      alive = false
    }
  }, [])

  // Auto-rotate every 10 seconds (respects the admin interval feel without
  // requiring another setting). Paused while the shopper is interacting.
  useEffect(() => {
    if (banners.length <= 1) return
    intervalRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length)
    }, 10000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [banners.length])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    slideWidth.current = el.clientWidth
    const onScroll = () => {
      if (slideWidth.current <= 0) return
      const next = Math.round(el.scrollLeft / slideWidth.current)
      setActive(Math.max(0, Math.min(banners.length - 1, next)))
      setIndex(active)
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [banners.length, active])

  const goTo = useCallback(
    (i: number) => {
      setIndex(i)
      setActive(i)
      const el = containerRef.current
      if (!el || banners.length === 0) return
      const left = i * el.clientWidth
      el.scrollTo({ left, behavior: "smooth" })
    },
    [banners.length]
  )

  if (banners.length === 0) return null

  return (
    <section className={className}>
      <div className="relative w-full overflow-hidden bg-[#F8FAFC]">
        <div
          ref={containerRef}
          className="flex w-full snap-x snap-mandatory scroll-smooth overflow-x-auto overflow-y-hidden no-scrollbar"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          onWheel={(e) => {
            // Horizontal scroll on wheel for mouse/trackpad shoppers.
            if (e.deltaX !== 0) {
              e.preventDefault()
              const el = containerRef.current
              if (el) el.scrollBy({ left: e.deltaX, behavior: "auto" })
            }
          }}
        >
          {banners.map((b, i) => {
            const href = b.link ? cleanLink(b.link) : ""
            const image = marketImage(b.image)
            const isActive = i === active
            return (
              <div key={`mobile-banner-${b.id}`} className="flex-shrink-0 w-full snap-center">
                {href ? (
                  <Link href={href} aria-label={`Banner ${i + 1}`} className="block">
                    <div className="relative aspect-[2/1] w-full overflow-hidden bg-[#F8FAFC] group">
                      <img
                        // eslint-disable-next-line @next/next/no-img-element
                        src={image}
                        alt={b.name}
                        loading="lazy"
                        decoding="async"
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isActive ? "animate-pulse" : ""}`}
                      />
                      <span className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                    </div>
                  </Link>
                ) : (
                  <div className="relative aspect-[2/1] w-full overflow-hidden bg-[#F8FAFC]">
                    <img
                      // eslint-disable-next-line @next/next/no-img-element
                      src={image}
                      alt={b.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute inset-0 bg-black/5" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Pagination dots — only when more than one slide */}
        {banners.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Slide ${i + 1}`}
                aria-current={i === active ? "true" : undefined}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === active
                    ? "bg-[#FF6B00] shadow-[0_0_0_4px_rgba(255,107,0,0.35)]"
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
