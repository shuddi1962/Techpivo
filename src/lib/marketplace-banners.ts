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

export interface MarketBanners {
  hero_image: string
  promo_image: string
  promo_deals_image: string
  promo_new_image: string
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
      Upload as many as you want per space — the storefront auto-slides. */
  hero_slides: string[]
  promo_slides: string[]
  promo_deals_slides: string[]
  promo_new_slides: string[]
  /** Slider behaviour (one setting drives every banner slider, live). */
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
// Slots with a slidesKey accept MULTIPLE images (cover + extra slides)
// that auto-slide on the storefront with the chosen transition.
export const BANNER_SLOTS = [
  {
    id: "hero_image",
    slidesKey: "hero_slides",
    label: "Homepage hero (main left banner)",
    dims: "1600 × 640 px (2.5:1 wide — min 1200 × 480)",
    hint: "Fills the full left 2/3 banner edge to edge (desktop ~935 × 400, object-cover: crops sides on odd ratios, never leaves gaps). Upload more below to slide. Clear it to bring the default hero back.",
  },
  {
    id: "promo_image",
    slidesKey: "promo_slides",
    label: "Promo banner",
    dims:  "1600 × 500 px",
    hint: "Wide strip above the brand row. Shows clean with no text or button — design all words into the image. Upload more below to slide.",
  },
  {
    id: "promo_deals_image",
    slidesKey: "promo_deals_slides",
    label: "Hero side promo — Deals (red, top right)",
    dims: "900 × 390 px (2.3:1 wide — min 600 × 260)",
    hint: "Shows clean with no overlay text, icons or buttons — design all words into the image. Upload more below to slide.",
  },
  {
    id: "promo_new_image",
    slidesKey: "promo_new_slides",
    label: "Hero side promo — New arrivals (orange, bottom right)",
    dims: "900 × 390 px (2.3:1 wide — min 600 × 260)",
    hint: "Shows clean with no overlay text, icons or buttons — design all words into the image. Upload more below to slide.",
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

export function parseBanners(raw: unknown): MarketBanners {
  if (!raw || typeof raw !== "object") return { ...EMPTY_BANNERS, departments: {} }
  const r = raw as Record<string, unknown>
  const str = (v: unknown) => (typeof v === "string" ? v : "")
  const arr = (v: unknown): string[] => {
    if (!Array.isArray(v)) return []
    const out: string[] = []
    for (const x of v) {
      if (typeof x === "string" && x.trim() && !out.includes(x.trim()) && out.length < 10) out.push(x.trim())
    }
    return out
  }
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
  return {
    hero_image: str(r.hero_image).trim(),
    promo_image: str(r.promo_image).trim(),
    promo_deals_image: str(r.promo_deals_image).trim(),
    promo_new_image: str(r.promo_new_image).trim(),
    category_default: str(r.category_default).trim(),
    promo_enabled: typeof r.promo_enabled === "boolean" ? r.promo_enabled : true,
    shop_image: str(r.shop_image).trim(),
    deals_image: str(r.deals_image).trim(),
    best_sellers_image: str(r.best_sellers_image).trim(),
    new_arrivals_image: str(r.new_arrivals_image).trim(),
    top_stores_image: str(r.top_stores_image).trim(),
    track_image: str(r.track_image).trim(),
    hero_slides: arr(r.hero_slides),
    promo_slides: arr(r.promo_slides),
    promo_deals_slides: arr(r.promo_deals_slides),
    promo_new_slides: arr(r.promo_new_slides),
    slider_transition: transition,
    slider_duration: duration,
    slider_easing: easing,
    slider_autoplay: typeof r.slider_autoplay === "boolean" ? r.slider_autoplay : true,
    slider_interval: interval,
    slider_arrows: typeof r.slider_arrows === "boolean" ? r.slider_arrows : true,
    slider_dots: typeof r.slider_dots === "boolean" ? r.slider_dots : true,
    slider_progress: typeof r.slider_progress === "boolean" ? r.slider_progress : true,
    slider_thumbs: typeof r.slider_thumbs === "boolean" ? r.slider_thumbs : false,
    departments,
  }
}

// Every image for a slot: cover first, then extra slides — deduped.
// Empty array = no upload (the default design shows instead).
export function slidesOf(single: string | null | undefined, multi: string[] | null | undefined): string[] {
  const out: string[] = []
  const push = (v: string | null | undefined) => {
    const t = typeof v === "string" ? v.trim() : ""
    if (t && !out.includes(t)) out.push(t)
  }
  push(single)
  if (Array.isArray(multi)) multi.forEach(push)
  return out
}
