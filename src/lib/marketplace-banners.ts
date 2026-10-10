// TechPivo Market — storefront banner settings (DB-driven, admin-editable).
// Stored in site_settings under key "marketplace_banners" as JSON:
//   { hero_image, promo_image, category_default, departments: {...},
//     shop_image, deals_image, best_sellers_image, new_arrivals_image,
//     top_stores_image, track_image }
// Empty string = use the built-in default. The homepage hero + both
// side promos render FILL (object-cover, edge to edge — odd ratios are
// cropped, never letterboxed); other collection/utility page banners
// render in FULL (never cropped); category banners render with
// object-cover under a text scrim.

export const MARKETPLACE_BANNERS_KEY = "marketplace_banners"

// Slider transition styles (admin-selectable, applied to every
// storefront banner slider in realtime). Each id has its own distinct
// visual behaviour — see BannerSlider for the implementation.
export const BANNER_TRANSITION_GROUPS = [
  { id: "classic", label: "Classic" },
  { id: "3d", label: "3D" },
  { id: "cinematic", label: "Zoom & Cinematic" },
  { id: "scatter", label: "Scatter & Particle" },
  { id: "reveal", label: "Reveal" },
] as const

export type BannerTransitionGroup = (typeof BANNER_TRANSITION_GROUPS)[number]["id"]

export const BANNER_TRANSITIONS = [
  { id: "fade", group: "classic", label: "Fade", hint: "Smooth opacity crossfade." },
  { id: "slide-left", group: "classic", label: "Slide Left", hint: "Incoming banner glides in from the right." },
  { id: "slide-right", group: "classic", label: "Slide Right", hint: "Incoming banner glides in from the left." },
  { id: "slide-up", group: "classic", label: "Slide Up", hint: "Incoming banner rises from the bottom." },
  { id: "slide-down", group: "classic", label: "Slide Down", hint: "Incoming banner drops from the top." },
  { id: "wipe", group: "classic", label: "Wipe", hint: "Directional wipe reveals the next banner." },
  { id: "cube", group: "3d", label: "3D Cube", hint: "Rotates like a cube face in 3D space." },
  { id: "flip", group: "3d", label: "3D Flip", hint: "Flips over to reveal the next banner." },
  { id: "rotate-3d", group: "3d", label: "Perspective Rotate", hint: "Swings in with realistic 3D depth." },
  { id: "zoom-in", group: "cinematic", label: "Zoom In", hint: "Incoming banner scales up smoothly." },
  { id: "zoom-out", group: "cinematic", label: "Zoom Out", hint: "Outgoing banner shrinks away." },
  { id: "kenburns", group: "cinematic", label: "Ken Burns", hint: "Cinematic slow pan-and-zoom, fading between banners." },
  { id: "blur", group: "cinematic", label: "Blur Reveal", hint: "Soft blur sharpens into the next banner." },
  { id: "tiles", group: "scatter", label: "Tile Scatter", hint: "Outgoing banner bursts into flying tiles." },
  { id: "blocks", group: "scatter", label: "Block Reveal", hint: "Next banner assembles from random blocks." },
  { id: "glitch", group: "scatter", label: "Glitch", hint: "Brief digital glitch with RGB-split slices." },
  { id: "particles", group: "scatter", label: "Particle Dissolve", hint: "Outgoing banner crumbles into particles." },
  { id: "curtain", group: "reveal", label: "Curtain Reveal", hint: "Two panels part to reveal the next banner." },
  { id: "diagonal", group: "reveal", label: "Diagonal Wipe", hint: "Reveals along a diagonal edge." },
] as const

export type BannerTransition = (typeof BANNER_TRANSITIONS)[number]["id"]

// Effects that need an imperative overlay (tiles/canvas/WAAPI) rather
// than pure CSS classes.
export const FX_TRANSITIONS: BannerTransition[] = [
  "wipe", "cube", "flip", "rotate-3d", "zoom-out",
  "tiles", "blocks", "glitch", "particles", "curtain", "diagonal",
]

export const SLIDER_EASINGS = [
  { id: "linear", label: "Linear", css: "linear" },
  { id: "ease", label: "Ease", css: "ease" },
  { id: "ease-in-out", label: "Ease In-Out", css: "ease-in-out" },
  { id: "swift", label: "Swift (smooth stop)", css: "cubic-bezier(0.22, 1, 0.36, 1)" },
  { id: "spring", label: "Spring (playful overshoot)", css: "cubic-bezier(0.34, 1.4, 0.64, 1)" },
] as const

export type SliderEasing = (typeof SLIDER_EASINGS)[number]["id"]

export function easingCss(id: string | null | undefined): string {
  return SLIDER_EASINGS.find((e) => e.id === id)?.css || "cubic-bezier(0.22, 1, 0.36, 1)"
}

export interface BannerSlide {
  image: string
  /** Destination the banner opens (internal path, #anchor or https URL).
      Empty = the banner is not clickable. */
  link: string
}

export interface SlotSlider {
  transition: BannerTransition
  duration: number
  easing: SliderEasing
  autoplay: boolean
  interval: number
  arrows: boolean
  dots: boolean
  progress: boolean
  thumbs: boolean
}

export const DEFAULT_SLOT_SLIDER: SlotSlider = {
  transition: "fade",
  duration: 700,
  easing: "swift",
  autoplay: true,
  interval: 5,
  arrows: true,
  dots: true,
  progress: true,
  thumbs: false,
}

/** Slots that can hold several sliding images, each with its own settings. */
export const SLIDER_SLOT_KEYS = [
  "hero_slides",
  "promo_slides",
  "promo_deals_slides",
  "promo_new_slides",
  "strip1_slides",
  "strip2_slides",
] as const

export type SliderSlotKey = (typeof SLIDER_SLOT_KEYS)[number]

export interface MarketBanners {
  hero_image: string
  promo_image: string
  promo_deals_image: string
  promo_new_image: string
  strip1_image: string
  strip2_image: string
  category_default: string
  departments: Record<string, string>
  /** Black Friday promo surfaces (top strip, Specials button, homepage
      promo banner + hero kicker). False = hidden publicly, instantly. */
  promo_enabled: boolean
  shop_image: string
  deals_image: string
  best_sellers_image: string
  new_arrivals_image: string
  top_stores_image: string
  track_image: string
  /** Extra slider images per slot (cover field above = slide 1).
      Upload as many as you want per space — each slot slides with its
      OWN settings below (autoplay off = swipe through them manually). */
  hero_slides: BannerSlide[]
  promo_slides: BannerSlide[]
  promo_deals_slides: BannerSlide[]
  promo_new_slides: BannerSlide[]
  strip1_slides: BannerSlide[]
  strip2_slides: BannerSlide[]
  /** Destination per uploaded image, keyed by exact image URL. Covers
      single-image banners (page / department / category banners) and
      every slider image. */
  links: Record<string, string>
  /** Per-slot slider settings. A slot with no entry uses the legacy
      global slider_* fields (first save migrates everything across). */
  slot_settings: Partial<Record<SliderSlotKey, SlotSlider>>
  /** Legacy global slider behaviour (kept for old rows; the admin now
      writes per-slot settings instead). */
  slider_transition: BannerTransition
  slider_duration: number
  slider_easing: SliderEasing
  slider_autoplay: boolean
  slider_interval: number
  slider_arrows: boolean
  slider_dots: boolean
  slider_progress: boolean
  slider_thumbs: boolean
}

export const EMPTY_BANNERS: MarketBanners = {
  hero_image: "",
  promo_image: "",
  promo_deals_image: "",
  promo_new_image: "",
  strip1_image: "",
  strip2_image: "",
  category_default: "",
  departments: {},
  promo_enabled: true,
  shop_image: "",
  deals_image: "",
  best_sellers_image: "",
  new_arrivals_image: "",
  top_stores_image: "",
  track_image: "",
  hero_slides: [],
  promo_slides: [],
  promo_deals_slides: [],
  promo_new_slides: [],
  strip1_slides: [],
  strip2_slides: [],
  links: {},
  slot_settings: {},
  slider_transition: "fade",
  slider_duration: 700,
  slider_easing: "swift",
  slider_autoplay: true,
  slider_interval: 5,
  slider_arrows: true,
  slider_dots: true,
  slider_progress: true,
  slider_thumbs: false,
}

// Recommended upload dimensions — shown in Admin so uploads fit well.
// Slots with a slidesKey accept MULTIPLE images (cover + extra slides),
// each with its own link, sliding with that slot's OWN settings.
export const BANNER_SLOTS = [
  {
    id: "hero_image",
    slidesKey: "hero_slides",
    slider: true,
    label: "Homepage hero (main left banner)",
    dims: "1600 × 640 px (2.5:1 wide — min 1200 × 480)",
    hint: "Fills the full left 2/3 banner edge to edge (desktop ~935 × 400, object-cover: crops sides on odd ratios, never leaves gaps). Upload more below to slide. Clear it to bring the default hero back.",
  },
  {
    id: "promo_image",
    slidesKey: "promo_slides",
    slider: true,
    label: "Promo banner",
    dims:  "1600 × 500 px",
    hint: "Wide strip above the brand row. Shows clean with no text or button — design all words into the image. Upload more below to slide.",
  },
  {
    id: "promo_deals_image",
    slidesKey: "promo_deals_slides",
    slider: true,
    label: "Hero side promo — Deals (red, top right)",
    dims: "900 × 390 px (2.3:1 wide — min 600 × 260)",
    hint: "Shows clean with no overlay text, icons or buttons — design all words into the image. Upload more below to slide.",
  },
  {
    id: "promo_new_image",
    slidesKey: "promo_new_slides",
    slider: true,
    label: "Hero side promo — New arrivals (orange, bottom right)",
    dims: "900 × 390 px (2.3:1 wide — min 600 × 260)",
    hint: "Shows clean with no overlay text, icons or buttons — design all words into the image. Upload more below to slide.",
  },
  {
    id: "strip1_image",
    slidesKey: "strip1_slides",
    slider: true,
    label: "In-feed strip — after Trending Now",
    dims: "1600 × 300 px (slim — min 1200 × 220)",
    hint: "Slim full-width strip between the Trending Now rail and the department showcases. Leave empty to hide it completely. Upload more below to slide.",
  },
  {
    id: "strip2_image",
    slidesKey: "strip2_slides",
    slider: true,
    label: "In-feed strip — before Top Stores",
    dims: "1600 × 300 px (slim — min 1200 × 220)",
    hint: "Slim full-width strip between the department showcases and Top Stores. Leave empty to hide it completely. Upload more below to slide.",
  },
  {
    id: "category_default",
    label: "Category pages (default)",
    dims: "1600 × 600 px",
    hint: "Used on every department/category page banner unless that department has its own image below.",
  },
  {
    id: "shop_image",
    label: "Shop page",
    dims: "1600 × 600 px (any ratio fits)",
    hint: "Shown in FULL on the Shop page (never cropped) — any ratio fits, like the homepage hero.",
  },
  {
    id: "deals_image",
    label: "Deals of the Day page",
    dims: "1600 × 600 px (any ratio fits)",
    hint: "Shown in FULL on the Deals of the Day page (never cropped) — any ratio fits.",
  },
  {
    id: "best_sellers_image",
    label: "Best Sellers page",
    dims: "1600 × 600 px (any ratio fits)",
    hint: "Shown in FULL on the Best Sellers page (never cropped) — any ratio fits.",
  },
  {
    id: "new_arrivals_image",
    label: "New Arrivals page",
    dims: "1600 × 600 px (any ratio fits)",
    hint: "Shown in FULL on the New Arrivals page (never cropped) — any ratio fits.",
  },
  {
    id: "top_stores_image",
    label: "Top Stores page",
    dims: "1600 × 600 px (any ratio fits)",
    hint: "Shown in FULL on the Top Stores page (never cropped) — any ratio fits.",
  },
  {
    id: "track_image",
    label: "Track Order page",
    dims: "1600 × 600 px (any ratio fits)",
    hint: "Shown in FULL on the Track Order page (never cropped) — any ratio fits.",
  },
] as const

export const DEPT_BANNER_DIMS = "1200 × 600 px"
export const DEPT_TILE_DIMS = "800 × 800 px (square — tiles crop to square)"

export function deptBannerOf(b: MarketBanners | null | undefined, slug: string, fallback: string): string {
  const custom = b?.departments?.[slug]?.trim()
  if (custom) return custom
  const def = b?.category_default?.trim()
  if (def) return def
  return fallback
}

// Uploaded banner for a collection/utility page (shop, deals, best
// sellers, new arrivals, top stores, track). Empty string = no upload,
// the page renders its default gradient hero.
export type PageBannerKey =
  | "shop_image"
  | "deals_image"
  | "best_sellers_image"
  | "new_arrivals_image"
  | "top_stores_image"
  | "track_image"

export function pageBannerOf(b: MarketBanners | null | undefined, key: PageBannerKey): string {
  const v = b?.[key]
  return typeof v === "string" ? v.trim() : ""
}

// Destination allowlist: in-store paths, #anchors and https links.
// Anything else (javascript:, data:, whitespace …) is dropped.
export function cleanBannerLink(v: unknown): string {
  if (typeof v !== "string") return ""
  const t = v.trim().slice(0, 500)
  if (!t || /\s/.test(t)) return ""
  if (t === "/" || t.startsWith("#")) return t
  if (t.startsWith("/") && !t.startsWith("//")) return t
  if (/^https?:\/\//i.test(t)) return t
  return ""
}

function slideArr(v: unknown): BannerSlide[] {
  if (!Array.isArray(v)) return []
  const out: BannerSlide[] = []
  const seen = new Set<string>()
  for (const x of v) {
    if (out.length >= 10) break
    if (typeof x === "string") {
      const t = x.trim()
      if (t && !seen.has(t)) {
        seen.add(t)
        out.push({ image: t, link: "" })
      }
    } else if (x && typeof x === "object") {
      // New { image, link } shape (legacy plain strings still accepted).
      const o = x as Record<string, unknown>
      const img = typeof o.image === "string" ? o.image.trim() : ""
      if (img && !seen.has(img)) {
        seen.add(img)
        out.push({ image: img, link: cleanBannerLink(o.link) })
      }
    }
  }
  return out
}

function slotSliderArr(
  v: unknown,
  fallback: SlotSlider
): Partial<Record<SliderSlotKey, SlotSlider>> {
  const out: Partial<Record<SliderSlotKey, SlotSlider>> = {}
  if (!v || typeof v !== "object") return out
  const r = v as Record<string, unknown>
  for (const key of SLIDER_SLOT_KEYS) {
    const s = r[key]
    if (!s || typeof s !== "object") continue
    const o = s as Record<string, unknown>
    const tRaw = typeof o.transition === "string" ? o.transition.trim().toLowerCase() : ""
    out[key] = {
      transition: (BANNER_TRANSITIONS.some((t) => t.id === tRaw) ? tRaw : fallback.transition) as BannerTransition,
      duration:
        Number.isFinite(Number(o.duration))
          ? Math.min(3000, Math.max(300, Math.round(Number(o.duration))))
          : fallback.duration,
      easing: (SLIDER_EASINGS.some((e) => e.id === o.easing) ? o.easing : fallback.easing) as SliderEasing,
      autoplay: typeof o.autoplay === "boolean" ? o.autoplay : fallback.autoplay,
      interval:
        Number.isFinite(Number(o.interval))
          ? Math.min(30, Math.max(2, Math.round(Number(o.interval))))
          : fallback.interval,
      arrows: typeof o.arrows === "boolean" ? o.arrows : fallback.arrows,
      dots: typeof o.dots === "boolean" ? o.dots : fallback.dots,
      progress: typeof o.progress === "boolean" ? o.progress : fallback.progress,
      thumbs: o.thumbs === true,
    }
  }
  return out
}

export function parseBanners(raw: unknown): MarketBanners {
  if (!raw || typeof raw !== "object") return { ...EMPTY_BANNERS, departments: {}, links: {}, slot_settings: {} }
  const r = raw as Record<string, unknown>
  const str = (v: unknown) => (typeof v === "string" ? v : "")
  const deps = r.departments && typeof r.departments === "object" ? (r.departments as Record<string, unknown>) : {}
  const departments: Record<string, string> = {}
  for (const [k, v] of Object.entries(deps)) {
    if (typeof v === "string" && v.trim()) departments[k] = v.trim()
  }
  const transitionRaw = str(r.slider_transition).trim().toLowerCase()
  const transition: BannerTransition = (BANNER_TRANSITIONS.some((t) => t.id === transitionRaw)
    ? transitionRaw
    : "fade") as BannerTransition
  const intervalRaw = Number(r.slider_interval)
  const interval = Number.isFinite(intervalRaw) ? Math.min(30, Math.max(2, Math.round(intervalRaw))) : 5
  const durationRaw = Number(r.slider_duration)
  const duration = Number.isFinite(durationRaw) ? Math.min(3000, Math.max(300, Math.round(durationRaw))) : 700
  const easingRaw = str(r.slider_easing).trim().toLowerCase()
  const easing: SliderEasing = (SLIDER_EASINGS.some((e) => e.id === easingRaw) ? easingRaw : "swift") as SliderEasing
  const legacy: SlotSlider = {
    transition,
    duration,
    easing,
    autoplay: typeof r.slider_autoplay === "boolean" ? r.slider_autoplay : true,
    interval,
    arrows: typeof r.slider_arrows === "boolean" ? r.slider_arrows : true,
    dots: typeof r.slider_dots === "boolean" ? r.slider_dots : true,
    progress: typeof r.slider_progress === "boolean" ? r.slider_progress : true,
    thumbs: r.slider_thumbs === true,
  }
  const hero_slides = slideArr(r.hero_slides)
  const promo_slides = slideArr(r.promo_slides)
  const promo_deals_slides = slideArr(r.promo_deals_slides)
  const promo_new_slides = slideArr(r.promo_new_slides)
  const strip1_slides = slideArr(r.strip1_slides)
  const strip2_slides = slideArr(r.strip2_slides)
  const hero_image = str(r.hero_image).trim()
  const promo_image = str(r.promo_image).trim()
  const promo_deals_image = str(r.promo_deals_image).trim()
  const promo_new_image = str(r.promo_new_image).trim()
  const strip1_image = str(r.strip1_image).trim()
  const strip2_image = str(r.strip2_image).trim()
  const category_default = str(r.category_default).trim()
  const shop_image = str(r.shop_image).trim()
  const deals_image = str(r.deals_image).trim()
  const best_sellers_image = str(r.best_sellers_image).trim()
  const new_arrivals_image = str(r.new_arrivals_image).trim()
  const top_stores_image = str(r.top_stores_image).trim()
  const track_image = str(r.track_image).trim()
  // Keep only links that point at an image still in use (kills orphans).
  const live = new Set<string>([
    hero_image, promo_image, promo_deals_image, promo_new_image,
    strip1_image, strip2_image, category_default,
    shop_image, deals_image, best_sellers_image,
    new_arrivals_image, top_stores_image, track_image,
    ...Object.values(departments),
    ...hero_slides.map((s) => s.image),
    ...promo_slides.map((s) => s.image),
    ...promo_deals_slides.map((s) => s.image),
    ...promo_new_slides.map((s) => s.image),
    ...strip1_slides.map((s) => s.image),
    ...strip2_slides.map((s) => s.image),
  ].filter(Boolean))
  const links: Record<string, string> = {}
  if (r.links && typeof r.links === "object") {
    for (const [k, v] of Object.entries(r.links as Record<string, unknown>)) {
      const url = k.trim()
      const dest = cleanBannerLink(v)
      if (url && dest && live.has(url) && Object.keys(links).length < 200) links[url] = dest
    }
  }
  return {
    hero_image,
    promo_image,
    promo_deals_image,
    promo_new_image,
    strip1_image,
    strip2_image,
    category_default,
    promo_enabled: typeof r.promo_enabled === "boolean" ? r.promo_enabled : true,
    shop_image,
    deals_image,
    best_sellers_image,
    new_arrivals_image,
    top_stores_image,
    track_image,
    hero_slides,
    promo_slides,
    promo_deals_slides,
    promo_new_slides,
    strip1_slides,
    strip2_slides,
    links,
    slot_settings: slotSliderArr(r.slot_settings, legacy),
    slider_transition: transition,
    slider_duration: duration,
    slider_easing: easing,
    slider_autoplay: legacy.autoplay,
    slider_interval: interval,
    slider_arrows: legacy.arrows,
    slider_dots: legacy.dots,
    slider_progress: legacy.progress,
    slider_thumbs: legacy.thumbs,
    departments,
  }
}

// Every image for a slot: cover first, then extra slides — deduped,
// each carrying its destination link (own link wins, links map fills in).
// Empty array = no upload (the default design shows instead).
export function slidesOfObjects(
  single: string | null | undefined,
  multi: BannerSlide[] | Array<string | BannerSlide> | null | undefined,
  links?: Record<string, string> | null
): BannerSlide[] {
  const out: BannerSlide[] = []
  const seen = new Set<string>()
  const linkOf = (img: string, own: string) => own || (links?.[img] || "")
  const cover = typeof single === "string" ? single.trim() : ""
  if (cover && !seen.has(cover)) {
    seen.add(cover)
    out.push({ image: cover, link: linkOf(cover, "") })
  }
  if (Array.isArray(multi)) {
    for (const x of multi) {
      if (out.length >= 11) break
      if (typeof x === "string") {
        const t = x.trim()
        if (t && !seen.has(t)) {
          seen.add(t)
          out.push({ image: t, link: linkOf(t, "") })
        }
      } else if (x && typeof (x as BannerSlide).image === "string") {
        const t = (x as BannerSlide).image.trim()
        if (t && !seen.has(t)) {
          seen.add(t)
          out.push({ image: t, link: linkOf(t, cleanBannerLink((x as BannerSlide).link)) })
        }
      }
    }
  }
  return out
}

// Legacy helper kept for callers that only need raw image URLs.
export function slidesOf(
  single: string | null | undefined,
  multi: BannerSlide[] | Array<string | BannerSlide> | string[] | null | undefined
): string[] {
  return slidesOfObjects(single, multi as BannerSlide[] | null | undefined).map((s) => s.image)
}

// Effective slider settings for one slot (per-slot override, else the
// legacy global values carried over from before the upgrade).
export function slotSliderOf(b: MarketBanners | null | undefined, key: SliderSlotKey): SlotSlider {
  const over = b?.slot_settings?.[key]
  if (!over) {
    return {
      transition: b?.slider_transition || "fade",
      duration: b?.slider_duration || 700,
      easing: b?.slider_easing || "swift",
      autoplay: b?.slider_autoplay !== false,
      interval: b?.slider_interval || 5,
      arrows: b?.slider_arrows !== false,
      dots: b?.slider_dots !== false,
      progress: b?.slider_progress !== false,
      thumbs: b?.slider_thumbs === true,
    }
  }
  return { ...DEFAULT_SLOT_SLIDER, ...over }
}

// Slider props object for <BannerSlider> from one slot's settings.
export function slotSliderProps(b: MarketBanners | null | undefined, key: SliderSlotKey) {
  const s = slotSliderOf(b, key)
  return {
    transition: s.transition,
    durationMs: s.duration,
    easingCss: easingCss(s.easing),
    autoplay: s.autoplay,
    intervalSec: s.interval,
    showArrows: s.arrows,
    showDots: s.dots,
    showProgress: s.progress,
    showThumbs: s.thumbs,
  }
}

// Destination for any uploaded banner image ("" = not clickable).
export function linkOf(b: MarketBanners | null | undefined, image: string | null | undefined): string {
  if (!image) return ""
  return b?.links?.[image.trim()] || ""
}

// Where-can-a-banner-point presets (admin picker; custom URLs allowed).
export const BANNER_LINK_PRESETS: Array<{ value: string; label: string }> = [
  { value: "", label: "No link — banner is not clickable" },
  { value: "/marketplace", label: "Market home" },
  { value: "/marketplace/shop", label: "Shop all products" },
  { value: "/marketplace/deals", label: "Deals of the Day" },
  { value: "/marketplace/new-arrivals", label: "New Arrivals" },
  { value: "/marketplace/best-sellers", label: "Best Sellers" },
  { value: "/marketplace/top-stores", label: "Top Stores" },
  { value: "/marketplace/track", label: "Track Order" },
  { value: "/marketplace/wishlist", label: "Wishlist" },
  { value: "/marketplace/cart", label: "Cart" },
]

export function bannerLinkLabel(value: string | null | undefined): string {
  if (!value) return "No link"
  const hit = BANNER_LINK_PRESETS.find((p) => p.value === value)
  return hit ? hit.label : value
}
