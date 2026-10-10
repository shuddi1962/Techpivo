import { describe, expect, it } from "vitest"
import {
  BANNER_TRANSITIONS,
  BANNER_TRANSITION_GROUPS,
  EMPTY_BANNERS,
  cleanBannerLink,
  easingCss,
  linkOf,
  parseBanners,
  slidesOf,
  slidesOfObjects,
  slotSliderOf,
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

describe("slidesOf (legacy url helper)", () => {
  it("puts the cover first, then extras, deduped", () => {
    expect(slidesOf("a", ["b", "a", "c"])).toEqual(["a", "b", "c"])
  })

  it("accepts the new object shape too", () => {
    expect(
      slidesOf("a", [{ image: "b", link: "/x" }, "a", { image: "c", link: "" }])
    ).toEqual(["a", "b", "c"])
  })

  it("returns [] when nothing uploaded", () => {
    expect(slidesOf("", [])).toEqual([])
    expect(slidesOf(undefined, undefined)).toEqual([])
  })
})

describe("slidesOfObjects", () => {
  it("attaches links from the links map to cover and extras", () => {
    const out = slidesOfObjects("cover", ["two"], { cover: "/deals", two: "/shop" })
    expect(out).toEqual([
      { image: "cover", link: "/deals" },
      { image: "two", link: "/shop" },
    ])
  })

  it("a slide's own link wins over the map", () => {
    const out = slidesOfObjects("", [{ image: "a", link: "/own" }], { a: "/map" })
    expect(out).toEqual([{ image: "a", link: "/own" }])
  })

  it("dedupes cover vs extras", () => {
    expect(slidesOfObjects("a", ["a", "b"], {})).toEqual([
      { image: "a", link: "" },
      { image: "b", link: "" },
    ])
  })
})

describe("cleanBannerLink", () => {
  it("allows store paths, anchors and https urls", () => {
    expect(cleanBannerLink("/marketplace/deals")).toBe("/marketplace/deals")
    expect(cleanBannerLink("#trending")).toBe("#trending")
    expect(cleanBannerLink("https://example.com/x")).toBe("https://example.com/x")
  })

  it("drops javascript:, protocol-relative and gappy values", () => {
    expect(cleanBannerLink("javascript:alert(1)")).toBe("")
    expect(cleanBannerLink("//evil.com")).toBe("")
    expect(cleanBannerLink("/has space")).toBe("")
    expect(cleanBannerLink(42)).toBe("")
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
    expect(b.links).toEqual({})
    expect(b.slot_settings).toEqual({})
  })

  it("accepts legacy string slide arrays and clamps out-of-range numbers", () => {
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
    expect(b.hero_slides).toEqual([
      { image: "a", link: "" },
      { image: "b", link: "" },
    ])
  })

  it("seeds per-slot settings from legacy globals", () => {
    const b = parseBanners({ slider_transition: "zoom-in", slider_autoplay: false })
    const s = slotSliderOf(b, "hero_slides")
    expect(s.transition).toBe("zoom-in")
    expect(s.autoplay).toBe(false)
  })

  it("per-slot overrides win and clamp safely", () => {
    const b = parseBanners({
      slider_transition: "fade",
      slot_settings: {
        hero_slides: { transition: "tiles", duration: 99999, autoplay: false },
        strip1_slides: { transition: "nope" },
      },
    })
    expect(slotSliderOf(b, "hero_slides").transition).toBe("tiles")
    expect(slotSliderOf(b, "hero_slides").duration).toBe(3000)
    expect(slotSliderOf(b, "hero_slides").autoplay).toBe(false)
    // unknown transition falls back to the legacy global
    expect(slotSliderOf(b, "strip1_slides").transition).toBe("fade")
  })

  it("keeps links only for images still in use", () => {
    const b = parseBanners({
      hero_image: "keep",
      links: { keep: "/marketplace/deals", gone: "/marketplace/shop", bad: "javascript:x" },
    })
    expect(b.links).toEqual({ keep: "/marketplace/deals" })
    expect(linkOf(b, "keep")).toBe("/marketplace/deals")
    expect(linkOf(b, "gone")).toBe("")
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
