import { describe, expect, it } from "vitest"
import {
  BANNER_TRANSITIONS,
  BANNER_TRANSITION_GROUPS,
  EMPTY_BANNERS,
  easingCss,
  parseBanners,
  slidesOf,
} from "@/lib/marketplace-banners"

describe("banner transition registry", () => {
  it("every transition belongs to a known group", () => {
    const groups: Set<string> = new Set(BANNER_TRANSITION_GROUPS.map((g) => g.id))
    for (const t of BANNER_TRANSITIONS) {
      expect(groups.has(t.group)).toBe(true)
    }
  })

  it("transition ids are unique", () => {
    const ids = BANNER_TRANSITIONS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("covers all five required categories", () => {
    const groups: Set<string> = new Set(BANNER_TRANSITIONS.map((t) => t.group))
    for (const g of ["classic", "3d", "cinematic", "scatter", "reveal"]) {
      expect(groups.has(g)).toBe(true)
    }
  })
})

describe("easingCss", () => {
  it("resolves known easings to css curves", () => {
    expect(easingCss("linear")).toBe("linear")
    expect(easingCss("swift")).toContain("cubic-bezier")
  })

  it("falls back for unknown ids", () => {
    expect(easingCss("nope")).toContain("cubic-bezier")
    expect(easingCss(undefined)).toContain("cubic-bezier")
  })
})

describe("slidesOf", () => {
  it("puts the cover first, then extras, deduped", () => {
    expect(slidesOf("a", ["b", "a", "c"])).toEqual(["a", "b", "c"])
  })

  it("returns [] when nothing uploaded", () => {
    expect(slidesOf("", [])).toEqual([])
    expect(slidesOf(undefined, undefined)).toEqual([])
  })
})

describe("parseBanners slider settings", () => {
  it("defaults the full slider config on empty input", () => {
    const b = parseBanners({})
    expect(b.slider_transition).toBe("fade")
    expect(b.slider_duration).toBe(700)
    expect(b.slider_easing).toBe("swift")
    expect(b.slider_autoplay).toBe(true)
    expect(b.slider_progress).toBe(true)
    expect(b.slider_thumbs).toBe(false)
    expect(b.hero_slides).toEqual([])
  })

  it("accepts valid settings and clamps out-of-range numbers", () => {
    const b = parseBanners({
      slider_transition: "cube",
      slider_duration: 99999,
      slider_interval: 1,
      slider_easing: "spring",
      slider_autoplay: false,
      slider_thumbs: true,
      hero_slides: ["a", "b", "", 42, "a"],
    })
    expect(b.slider_transition).toBe("cube")
    expect(b.slider_duration).toBe(3000)
    expect(b.slider_interval).toBe(2)
    expect(b.slider_easing).toBe("spring")
    expect(b.slider_autoplay).toBe(false)
    expect(b.slider_thumbs).toBe(true)
    expect(b.hero_slides).toEqual(["a", "b"])
  })

  it("rejects unknown transitions and caps slide counts", () => {
    const b = parseBanners({
      slider_transition: "shatter-glass-9000",
      promo_slides: Array.from({ length: 15 }, (_, i) => `s${i}`),
    })
    expect(b.slider_transition).toBe("fade")
    expect(b.promo_slides).toHaveLength(10)
  })

  it("EMPTY_BANNERS stays a valid single-image config", () => {
    expect(EMPTY_BANNERS.slider_transition).toBe("fade")
    expect(slidesOf(EMPTY_BANNERS.hero_image, EMPTY_BANNERS.hero_slides)).toEqual([])
  })
})
