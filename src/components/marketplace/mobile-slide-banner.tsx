"use client"

import Link from "next/link"
import { useMemo } from "react"
import { marketImage } from "@/lib/marketplace-images"
import { cn } from "@/lib/utils"
import { type BannerSlide, type MarketBanners } from "@/lib/marketplace-banners"

/**
 * NEW MOBILE SLIDE BANNER — single full-width static banner.
 *
 * Renders flush against the header (zero top space) on mobile only;
 * hidden on desktop/tablet (md+).
 *
 * Slide source chain:
 *   1. banners.mobile_hero_image  (single cover)
 *   2. banners.mobile_hero_slides  (extra slides — only the first is shown)
 *   3. banners.hero_image          (desktop fallback)
 *   4. MARKETPLACE_HERO.image      (hardcoded fallback)
 *
 * Only the FIRST slide is rendered — any additional configured slides are
 * deliberately not shown, so no neighbouring banner can peek in and no
 * horizontal overflow is possible.
 *
 * - No scroll container, no flex, no snap, no rotation, no dots
 * - object-fit: cover fills the entire container with no letterboxing
 * - Admin uploads (mobile-hero-cover + mobile_hero_slides) display as-is
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

    if (out.length === 0) {
      const desktop = (banners.hero_image || "").trim()
      if (desktop) out.push({ image: desktop, link: "" })
    }

    return out
  }, [banners])

  const first = slides[0]
  if (!enabled || !first) return null

  const href = first.link ? cleanLink(first.link) : ""
  const image = marketImage(first.image)

  return (
    <section
      className={cn(
        "w-full overflow-hidden mt-0 mb-0 pt-0 pb-0",
        "md:hidden",
        className
      )}
      style={{
        marginTop: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
        overflow: "hidden",
        width: "100%",
        maxWidth: "100%",
      }}
    >
      <div className="relative w-full overflow-hidden bg-[#F8FAFC]" style={{ overflow: "hidden", width: "100%", maxWidth: "100%" }}>
        {href ? (
          <Link href={href} aria-label="Banner" className="block" style={{ display: "block", width: "100%" }}>
            <div className="relative w-full overflow-hidden bg-[#F8FAFC]">
              <img
                src={image}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
                style={{ width: "100%", height: "100%", display: "block" }}
              />
            </div>
          </Link>
        ) : (
          <div className="relative w-full overflow-hidden bg-[#F8FAFC]">
            <img
              src={image}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          </div>
        )}
      </div>
    </section>
  )
}

function cleanLink(v: string): string {
  const t = v.trim()
  if (!t || /\s/.test(t)) return ""
  if (t === "/" || t.startsWith("#")) return t
  if (t.startsWith("/") && !t.startsWith("//")) return t
  if (/^https?:\/\//i.test(t)) return t
  return ""
}
