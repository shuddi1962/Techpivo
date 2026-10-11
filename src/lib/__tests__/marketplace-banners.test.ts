import { describe, expect, it } from "vitest"
import {
  BANNER_TRANSITIONS,
  BANNER_TRANSITION_GROUPS,
  EMPTY_BANNERS,
  campaignView,
  cleanBannerLink,
  summarizePopupStats,
  defaultPopupCampaign,
  easingCss,
  linkOf,
  markPopupShown,
  parseBanners,
  parsePopupCampaigns,
  pickPopupCampaign,
  popupDue,
  slidesOf,
  slidesOfObjects,
  slotSliderOf,
  stampPopup,
  type PopupCampaign,
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

  it("parses per-department sidebar banners and prunes their orphan links", () => {
    const b = parseBanners({
      sidebar_banners: { phones: "side-img", "": "junk", empty: "  " },
      links: { "side-img": "/marketplace/deals", orphan: "/marketplace/shop" },
    })
    expect(b.sidebar_banners).toEqual({ phones: "side-img" })
    expect(b.links).toEqual({ "side-img": "/marketplace/deals" })
  })

  it("parses the welcome popup with clamping and safe fallbacks", () => {
    const b = parseBanners({
      popup_enabled: false,
      popup_title: "  ",
      popup_message: "Hi there",
      popup_points: ["One", "", 7, "Two", "Three", "Four"],
      popup_cta_link: "javascript:evil()",
      popup_delay_sec: 99,
      popup_autoclose_sec: -5,
    })
    expect(b.popup_enabled).toBe(false)
    expect(b.popup_title).toBe(EMPTY_BANNERS.popup_title)
    expect(b.popup_message).toBe("Hi there")
    expect(b.popup_points).toEqual(["One", "Two", "Three"])
    expect(b.popup_cta_link).toBe("#flash-deals")
    expect(b.popup_delay_sec).toBe(30)
    expect(b.popup_autoclose_sec).toBe(0)
  })

  it("parses popup design flags with safe fallbacks", () => {
    const b = parseBanners({
      popup_kicker: "",
      popup_show_title: false,
      popup_style: "neon",
      popup_size: "xl",
    })
    expect(b.popup_kicker).toBe(EMPTY_BANNERS.popup_kicker)
    expect(b.popup_show_title).toBe(false)
    expect(b.popup_show_message).toBe(true)
    expect(b.popup_style).toBe("dark")
    expect(b.popup_size).toBe("md")
  })

  it("parses popup mode and frequency with safe fallbacks", () => {
    expect(parseBanners({}).popup_mode).toBe("card")
    expect(parseBanners({}).popup_frequency).toBe("every")
    const b = parseBanners({ popup_mode: "banner", popup_frequency: "daily" })
    expect(b.popup_mode).toBe("banner")
    expect(b.popup_frequency).toBe("daily")
    const bad = parseBanners({ popup_mode: "video", popup_frequency: "hourly" })
    expect(bad.popup_mode).toBe("card")
    expect(bad.popup_frequency).toBe("every")
  })

  it("migrates legacy flat popup fields into one campaign", () => {
    const b = parseBanners({ popup_title: "Hello", popup_enabled: false })
    expect(b.popup_campaigns).toHaveLength(1)
    expect(b.popup_campaigns[0].id).toBe("default")
    expect(b.popup_campaigns[0].title).toBe("Hello")
    expect(b.popup_campaigns[0].enabled).toBe(false)
  })

  it("an explicit empty campaign list means no popup", () => {
    expect(parseBanners({ popup_campaigns: [] }).popup_campaigns).toEqual([])
    expect(parseBanners({}).popup_campaigns).toHaveLength(1)
  })

  it("parses, dedupes and caps campaign lists", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `c${i}`, name: `C${i}` }))
    const b = parseBanners({ popup_campaigns: [...many, { id: "c1", name: "Dup" }, 42] })
    expect(b.popup_campaigns).toHaveLength(10)
    expect(new Set(b.popup_campaigns.map((c) => c.id)).size).toBe(10)
  })
})

describe("pickPopupCampaign", () => {
  const base = (over: Partial<PopupCampaign>): PopupCampaign => ({ ...defaultPopupCampaign("T"), id: "t", ...over })

  it("returns null when every campaign is off or out of window", () => {
    expect(pickPopupCampaign([])).toBeNull()
    expect(pickPopupCampaign([base({ enabled: false })])).toBeNull()
    expect(
      pickPopupCampaign([base({ start_at: new Date(Date.now() + 86400000).toISOString() })])
    ).toBeNull()
    expect(
      pickPopupCampaign([base({ end_at: new Date(Date.now() - 86400000).toISOString() })])
    ).toBeNull()
  })

  it("top of the list wins and skips disabled/capped campaigns", () => {
    const off = base({ id: "off", enabled: false })
    const live = base({ id: "live", frequency: "every" })
    const second = base({ id: "second", frequency: "every" })
    expect(pickPopupCampaign([off, live, second], Date.now(), null)?.id).toBe("live")
    expect(pickPopupCampaign([second, live], Date.now(), null)?.id).toBe("second")
  })

  it("due campaigns take turns instead of the top one shadowing the rest", () => {
    const a = base({ id: "a", frequency: "every" })
    const b = base({ id: "b", frequency: "every" })
    const c = base({ id: "c", frequency: "every" })
    const list = [a, b, c]
    expect(pickPopupCampaign(list, Date.now(), null)?.id).toBe("a")
    expect(pickPopupCampaign(list, Date.now(), "a")?.id).toBe("b")
    expect(pickPopupCampaign(list, Date.now(), "b")?.id).toBe("c")
    expect(pickPopupCampaign(list, Date.now(), "c")?.id).toBe("a")
    // unknown last-shown (deleted campaign) restarts at the top
    expect(pickPopupCampaign(list, Date.now(), "gone")?.id).toBe("a")
  })

  it("rotation skips campaigns that are off or out of window", () => {
    const a = base({ id: "a", frequency: "every" })
    const off = base({ id: "off", enabled: false })
    const future = base({ id: "future", frequency: "every", start_at: new Date(Date.now() + 86400000).toISOString() })
    const b = base({ id: "b", frequency: "every" })
    const list = [a, off, future, b]
    expect(pickPopupCampaign(list, Date.now(), null)?.id).toBe("a")
    expect(pickPopupCampaign(list, Date.now(), "a")?.id).toBe("b")
    expect(pickPopupCampaign(list, Date.now(), "b")?.id).toBe("a")
  })

  it("popupDue honors session/daily/weekly caps without storage", () => {
    // no window in tests → fail-open so popups still work in SSR/prerender
    expect(popupDue("daily", "x")).toBe(true)
    expect(popupDue("every", "x")).toBe(true)
  })

  it("full multi-visit simulation: rotation + daily caps with mocked storage", () => {
    // In-memory browser storage so popupDue/stamps/rotation behave live.
    const mem: Record<string, string> = {}
    const store = {
      getItem: (k: string) => (k in mem ? mem[k] : null),
      setItem: (k: string, v: string) => {
        mem[k] = v
      },
      removeItem: (k: string) => {
        delete mem[k]
      },
    }
    ;(globalThis as unknown as { window: unknown }).window = {
      localStorage: store,
      sessionStorage: store,
    }
    try {
      const welcome = base({ id: "welcome", frequency: "every" })
      const promo = base({ id: "promo", frequency: "daily", mode: "banner", image: "img" })
      const list = [welcome, promo]
      // Visit 1: top campaign shows.
      expect(pickPopupCampaign(list)?.id).toBe("welcome")
      markPopupShown("welcome")
      stampPopup("every", "welcome")
      // Visit 2: rotation hands the turn to the banner campaign.
      expect(pickPopupCampaign(list)?.id).toBe("promo")
      markPopupShown("promo")
      stampPopup("daily", "promo")
      // Visit 3 (same day): daily promo is capped, welcome returns.
      expect(pickPopupCampaign(list)?.id).toBe("welcome")
      markPopupShown("welcome")
      // Visit 4: rotation alternates back to promo once its cap lifts.
      delete mem["tp_market_popup_v1:promo"]
      expect(pickPopupCampaign(list)?.id).toBe("promo")
    } finally {
      delete (globalThis as unknown as { window?: unknown }).window
    }
  })

  it("summarizePopupStats totals views/clicks/closes + CTR per campaign", () => {
    expect(summarizePopupStats([])).toEqual({})
    const s = summarizePopupStats([
      { campaign_id: "a", event: "view", created_at: "2026-10-01T10:00:00Z" },
      { campaign_id: "a", event: "view", created_at: "2026-10-02T10:00:00Z" },
      { campaign_id: "a", event: "click", created_at: "2026-10-02T10:01:00Z" },
      { campaign_id: "a", event: "close", created_at: "2026-10-02T10:02:00Z" },
      { campaign_id: "b", event: "click", created_at: "2026-10-02T11:00:00Z" },
      { campaign_id: "", event: "view", created_at: "2026-10-02T11:00:00Z" },
    ])
    expect(s.a).toEqual({ views: 2, clicks: 1, closes: 1, ctr: 50, lastShownAt: "2026-10-02T10:00:00Z" })
    expect(s.b).toEqual({ views: 0, clicks: 1, closes: 0, ctr: 0, lastShownAt: null })
    expect(s[""]).toBeUndefined()
  })

  it("campaignView adapts a campaign to the shared card", () => {
    const v = campaignView(base({ id: "v", title: "Sale", mode: "banner", image: "img" }))
    expect(v.popup_title).toBe("Sale")
    expect(v.popup_mode).toBe("banner")
    expect(v.popup_image).toBe("img")
  })

  it("EMPTY_BANNERS stays a valid single-image config", () => {
    expect(EMPTY_BANNERS.slider_transition).toBe("fade")
    expect(slidesOf(EMPTY_BANNERS.hero_image, EMPTY_BANNERS.hero_slides)).toEqual([])
  })
})
