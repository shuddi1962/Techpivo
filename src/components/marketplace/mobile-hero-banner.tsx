"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { marketImage } from "@/lib/marketplace-images"
import { cn } from "@/lib/utils"
import {
  type MobileBanner,
  type MobileBannerTransition,
  type MobileBannerTransitionEffect,
} from "@/lib/marketplace-mobile-banners"

/**
 * MOBILE HERO BANNER — standalone mobile-only carousel.
 *
 * Reads from /api/marketplace/mobile-banners (site_settings key
 * marketplace_mobile_banners) — completely independent of the desktop
 * banner system (marketplace_banners / BannerSlider). Desktop homepage
 * keeps showing its existing desktop banners untouched.
 *
 * Features:
 *   - Exactly one slide visible at a time (no partial neighbours)
 *   - No horizontal overflow, no white strips
 *   - object-fit: cover preserves aspect ratio; fills container
 *   - Configurable autoplay, interval, duration, effect (slide|fade)
 *   - Configurable navigation arrows + pagination dots
 *   - Pause on hover/touch interaction
 *   - Swipe gesture support
 *   - Works on 320px–430px mobile screens; hidden on md+
 */
export function MobileHeroBanner({ className }: { className?: string }) {
  const [settings, setSettings] = useState<{
    banners: MobileBanner[]
    transition: MobileBannerTransition
  } | null>(null)
  const [active, setActive] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch mobile banner settings from the admin-editable API endpoint.
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const res = await fetch("/api/marketplace/mobile-banners", {
          headers: { Accept: "application/json" },
        })
        if (!alive) return
        if (res.ok) {
          const data = await res.json()
          const banners = Array.isArray(data?.banners) ? data.banners : []
          const transition = data?.transition && typeof data.transition === "object"
            ? (data.transition as Partial<MobileBannerTransition>)
            : {}
          setSettings({
            banners: banners.filter((b: MobileBanner) => b.enabled),
            transition: {
              autoplay: typeof transition.autoplay === "boolean" ? transition.autoplay : true,
              intervalSec: Number.isFinite(Number(transition.intervalSec)) && Number(transition.intervalSec) > 0
                ? Math.max(1, Math.round(Number(transition.intervalSec)))
                : 5,
              durationMs: Number.isFinite(Number(transition.durationMs)) && Number(transition.durationMs) > 0
                ? Math.max(100, Math.round(Number(transition.durationMs)))
                : 400,
              effect: (transition.effect === "slide" || transition.effect === "fade")
                ? (transition.effect as MobileBannerTransitionEffect)
                : "slide",
              showArrows: typeof transition.showArrows === "boolean" ? transition.showArrows : true,
              showDots: typeof transition.showDots === "boolean" ? transition.showDots : true,
              pauseOnInteraction: typeof transition.pauseOnInteraction === "boolean" ? transition.pauseOnInteraction : true,
            },
          })
        }
      } catch {
        // fail silently — banner area simply stays empty
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  const banners = settings?.banners ?? []
  const transition = settings?.transition ?? {
    autoplay: true,
    intervalSec: 5,
    durationMs: 400,
    effect: "slide",
    showArrows: true,
    showDots: true,
    pauseOnInteraction: true,
  }

  const count = banners.length
  const displayCount = count > 0 ? count : 1

  const fallbackBanner: MobileBanner = {
    id: "fallback",
    name: "TechPivo Market",
    image: "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1080",
    link: "/marketplace",
    enabled: true,
    order: 0,
  }

  const displayBanners = count > 0 ? banners : [fallbackBanner]

  const canRotate = displayCount > 1 && transition.autoplay && !isTransitioning

  // Auto-rotate. Paused while a transition is running or user interacts.
  useEffect(() => {
    if (!canRotate) return
    const ms = Math.max(1000, transition.intervalSec * 1000)
    intervalRef.current = setInterval(() => {
      setActive((i) => (i + 1) % displayCount)
    }, ms)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    }, [canRotate, displayCount, transition.intervalSec, isTransitioning])

  const goTo = useCallback(
    (index: number) => {
      if (displayCount === 0) return
      const next = ((index % displayCount) + displayCount) % displayCount
      if (next === active) return
      setIsTransitioning(true)
      setActive(next)
      setTimeout(() => setIsTransitioning(false), transition.durationMs)
    },
    [active, displayCount, transition.durationMs]
  )

  const prev = useCallback(() => goTo(active - 1), [active, goTo])
  const next = useCallback(() => goTo(active + 1), [active, goTo])

  const isSlide = transition.effect === "slide"
  const activeIndex = active

  return (
    <section
      className={cn("w-full overflow-hidden md:hidden bg-[#F8FAFC] aspect-[2.4/1]", className)}
      style={{ width: "100%" }}
    >
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-hidden"
        style={{
          position: "relative",
          overflow: "hidden",
          width: "100%",
          display: "block",
        }}
        onMouseEnter={() => {
          if (transition.pauseOnInteraction) setIsTransitioning(true)
        }}
        onMouseLeave={() => {
          if (transition.pauseOnInteraction) setIsTransitioning(false)
        }}
        onTouchStart={(e) => {
          setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })
          if (transition.pauseOnInteraction) setIsTransitioning(true)
        }}
        onTouchEnd={(e) => {
          if (!touchStart) return
          const dx = e.changedTouches[0].clientX - touchStart.x
          const dy = e.changedTouches[0].clientY - touchStart.y
          if (transition.pauseOnInteraction) setIsTransitioning(false)
          setTouchStart(null)
          if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
            goTo(dx < 0 ? activeIndex + 1 : activeIndex - 1)
          }
        }}
      >
        {/* Slide track — each slide is exactly 100% wide for slide effect */}
        <div
          className="flex w-full transition-transform duration-[400ms] ease-in-out overflow-hidden"
          style={{
            width: isSlide ? `${displayCount * 100}%` : "100%",
            height: "100%",
            display: "flex",
            flexDirection: "row",
            flexWrap: "nowrap",
            transform: isSlide ? `translateX(${-activeIndex * 100}%)` : "none",
            transitionDuration: `${transition.durationMs}ms`,
            willChange: isSlide ? "transform" : "auto",
          }}
        >
          {displayBanners.map((banner, i) => {
            const href = banner.link ? cleanLink(banner.link) : ""
            const image = marketImage(banner.image)
            const isActiveSlide = i === activeIndex

            const slideStyle: React.CSSProperties = {
              width: isSlide ? "100%" : "100%",
              minWidth: isSlide ? "100%" : "100%",
              flexShrink: 0,
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }

            if (!isSlide) {
              // Fade effect: stack all slides, only active is visible
              slideStyle.opacity = isActiveSlide ? 1 : 0
              slideStyle.position = "absolute"
              slideStyle.top = 0
              slideStyle.left = 0
              slideStyle.right = 0
              slideStyle.bottom = 0
              slideStyle.transition = `opacity ${transition.durationMs}ms ease-in-out`
              slideStyle.willChange = "opacity"
            }

            const renderImage = () => (
              <img
                src={image}
                alt={banner.name || `Banner ${i + 1}`}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover block"
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  objectFit: "cover",
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  // Graceful handling: hide broken image, keep slide visible
                  target.style.display = "none"
                }}
              />
            )

            if (href) {
              return (
                <Link
                  key={`mobile-banner-${banner.id}`}
                  href={href}
                  aria-label={`Banner ${i + 1}`}
                  className="block w-full h-full"
                  style={{ width: "100%", height: "100%", display: "block", textDecoration: "none" }}
                >
                  <div style={slideStyle}>{renderImage()}</div>
                </Link>
              )
            }
            return (
              <div
                key={`mobile-banner-${banner.id}`}
                style={slideStyle}
              >
                {renderImage()}
              </div>
            )
          })}
        </div>

        {/* Pagination dots — only when more than one slide */}
        {displayCount > 1 && transition.showDots && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-2">
            {displayBanners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Slide ${i + 1}`}
                aria-current={i === activeIndex ? "true" : undefined}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  i === activeIndex
                    ? "bg-[#FF6B00] shadow-[0_0_0_4px_rgba(255,107,0,0.35)]"
                    : "bg-white/60 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        )}

        {/* Navigation arrows — only when more than one slide */}
        {displayCount > 1 && transition.showArrows && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                prev()
              }}
              aria-label="Previous banner"
              className="absolute left-2 top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/45 text-white px-2 py-1.5 hover:bg-black/60 transition-colors"
            >
              <span className="sr-only">Previous</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                next()
              }}
              aria-label="Next banner"
              className="absolute right-2 top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/45 text-white px-2 py-1.5 hover:bg-black/60 transition-colors"
            >
              <span className="sr-only">Next</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
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
