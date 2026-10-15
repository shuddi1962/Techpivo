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
  /** Homepage showcase sidebar banners, keyed by department slug.
      Shown clean (no SALE overlay) in that department's showcase rail;
      empty = the built-in SALE design. */
  sidebar_banners: Record<string, string>
  /** Black Friday promo surfaces (top strip, Specials button, homepage
      promo banner + hero kicker). False = hidden publicly, instantly. */
  promo_enabled: boolean
  /** Top utility bar — editable in Admin → Marketplace → Banners
      ("Promo bar"). Badge + messages + bar gradient. */
  promo_badge_text: string
  promo_message: string
  promo_message_mobile: string
  promo_bar_from: string
  promo_bar_to: string
  promo_badge_bg: string
  /** Flash Sale section (homepage #flash-deals) — editable in Admin →
      Marketplace → Banners ("Flash sale"). False = hidden publicly. */
  flash_enabled: boolean
  flash_badge: string
  flash_title: string
  flash_subtitle: string
  flash_bg_from: string
  flash_bg_to: string
  /** ISO datetime the flash countdown runs to. "" = rolling 2-day
      countdown from when the shopper opens the page. */
  flash_end_at: string
  /** Optional artwork for the Flash Sale card inside the Departments
      dropdown. Empty = the built-in gradient card with badge + headline. */
  flash_image: string
  /** "Specials" menu pill (storefront header, next to Departments).
      Fully admin-editable: full label text, destination (any in-store
      path, #anchor, category page or https link) and on/off switch.
      False = hidden publicly, instantly. */
  specials_enabled: boolean
  specials_label: string
  specials_link: string
  /** Welcome popup (homepage, once per visit). False = never shows. */
  popup_enabled: boolean
  popup_image: string
  popup_title: string
  popup_message: string
  popup_points: string[]
  popup_cta_text: string
  popup_cta_link: string
  popup_dismiss_text: string
  /** Seconds to wait before popping (0 = immediately). */
  popup_delay_sec: number
  /** Seconds before it closes itself (0 = stays until dismissed). */
  popup_autoclose_sec: number
  /** Badge line above the title ("Welcome Offer") + whether it shows. */
  popup_kicker: string
  popup_show_kicker: boolean
  /** Per-block visibility — turn any writeup off for a banner-only look. */
  popup_show_title: boolean
  popup_show_message: boolean
  popup_show_points: boolean
  popup_show_dismiss: boolean
  /** Visual theme + card width. */
  popup_style: PopupStyle
  popup_size: PopupSize
  /** card = writeup card; banner = uploaded image only (no text). */
  popup_mode: PopupMode
  /** How often a shopper sees it: every visit, once per tab session,
      once a day, or once a week (remembered on their device). */
  popup_frequency: PopupFrequency
  /** Ordered popup campaigns (top wins, one shows per visit). Empty with
      the key present = no popup at all. Absent (legacy rows) = migrated
      from the flat popup_* fields above. */
  popup_campaigns: PopupCampaign[]
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
  sidebar_banners: {},
  promo_enabled: true,
  promo_badge_text: "Limited Deal",
  promo_message: "Black Friday Sale! Special offers up to 50% Off at TechPivo Market",
  promo_message_mobile: "Up to 50% Off at TechPivo Market",
  promo_bar_from: "#1668DC",
  promo_bar_to: "#0F4FB3",
  promo_badge_bg: "#EF4444",
  flash_enabled: true,
  flash_badge: "Flash Sale",
  flash_title: "Special Offer — Up to 50% Off",
  flash_subtitle: "Hurry — discounted stock goes fast",
  flash_bg_from: "#DC2626",
  flash_bg_to: "#991B1B",
  flash_end_at: "",
  flash_image: "",
  specials_enabled: true,
  specials_label: "Flash Sale Specials",
  specials_link: "/marketplace#flash-deals",
  popup_enabled: true,
  popup_image: "",
  popup_title: "Welcome to TechPivo Market",
  popup_message: "Quality-checked products, secure payment and tracked delivery.",
  popup_points: [
    "Secure payment on every order",
    "Quality-checked products",
    "Tracked 7–12 day delivery",
  ],
  popup_cta_text: "Explore Now",
  popup_cta_link: "#flash-deals",
  popup_dismiss_text: "Browse",
  popup_delay_sec: 1,
  popup_autoclose_sec: 0,
  popup_kicker: "Welcome Offer",
  popup_show_kicker: true,
  popup_show_title: true,
  popup_show_message: true,
  popup_show_points: true,
  popup_show_dismiss: true,
  popup_style: "dark",
  popup_size: "md",
  popup_mode: "card",
  popup_frequency: "every",
  popup_campaigns: [],
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
    hint: "Slim full-width strip between the Trending Now rail and the department showcases. Empty = built-in tracked-delivery sample; upload to replace it with your own clean art.",
  },
  {
    id: "strip2_image",
    slidesKey: "strip2_slides",
    slider: true,
    label: "In-feed strip — before Top Stores",
    dims: "1600 × 300 px (slim — min 1200 × 220)",
    hint: "Slim full-width strip between the department showcases and Top Stores. Empty = built-in new-drops sample; upload to replace it with your own clean art.",
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
export const SIDEBAR_BANNER_DIMS = "600 × 900 px (portrait — min 400 × 600)"
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
  if (!raw || typeof raw !== "object")
    return {
      ...EMPTY_BANNERS,
      departments: {},
      sidebar_banners: {},
      links: {},
      slot_settings: {},
      popup_campaigns: [{ ...defaultPopupCampaign("Welcome popup"), id: "default" }],
    }
  const r = raw as Record<string, unknown>
  const str = (v: unknown) => (typeof v === "string" ? v : "")
  const strMap = (v: unknown): Record<string, string> => {
    const out: Record<string, string> = {}
    if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (k.trim() && typeof val === "string" && val.trim()) out[k.trim()] = val.trim()
      }
    }
    return out
  }
  const departments = strMap(r.departments)
  const sidebar_banners = strMap(r.sidebar_banners)
  const pointsRaw = Array.isArray(r.popup_points) ? r.popup_points : []
  const popup_points = pointsRaw
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim().slice(0, 120))
    .slice(0, 3)
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
    ...Object.values(sidebar_banners),
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
    promo_badge_text: str(r.promo_badge_text).trim().slice(0, 40) || EMPTY_BANNERS.promo_badge_text,
    promo_message: str(r.promo_message).trim().slice(0, 140) || EMPTY_BANNERS.promo_message,
    promo_message_mobile: str(r.promo_message_mobile).trim().slice(0, 80) || EMPTY_BANNERS.promo_message_mobile,
    promo_bar_from: cleanHex(r.promo_bar_from, EMPTY_BANNERS.promo_bar_from),
    promo_bar_to: cleanHex(r.promo_bar_to, EMPTY_BANNERS.promo_bar_to),
    promo_badge_bg: cleanHex(r.promo_badge_bg, EMPTY_BANNERS.promo_badge_bg),
    flash_enabled: typeof r.flash_enabled === "boolean" ? r.flash_enabled : true,
    flash_badge: str(r.flash_badge).trim().slice(0, 40) || EMPTY_BANNERS.flash_badge,
    flash_title: str(r.flash_title).trim().slice(0, 80) || EMPTY_BANNERS.flash_title,
    flash_subtitle: str(r.flash_subtitle).trim().slice(0, 140) || EMPTY_BANNERS.flash_subtitle,
    flash_bg_from: cleanHex(r.flash_bg_from, EMPTY_BANNERS.flash_bg_from),
    flash_bg_to: cleanHex(r.flash_bg_to, EMPTY_BANNERS.flash_bg_to),
    flash_end_at: cleanIsoDate(r.flash_end_at),
    flash_image: str(r.flash_image).trim().slice(0, 500),
    specials_enabled: typeof r.specials_enabled === "boolean" ? r.specials_enabled : true,
    specials_label: str(r.specials_label).trim().slice(0, 40) || EMPTY_BANNERS.specials_label,
    specials_link: cleanBannerLink(r.specials_link) || EMPTY_BANNERS.specials_link,
    popup_enabled: typeof r.popup_enabled === "boolean" ? r.popup_enabled : true,
    popup_image: str(r.popup_image).trim(),
    popup_title: str(r.popup_title).trim().slice(0, 80) || EMPTY_BANNERS.popup_title,
    popup_message: str(r.popup_message).trim().slice(0, 200) || EMPTY_BANNERS.popup_message,
    popup_points: popup_points.length > 0 ? popup_points : [...EMPTY_BANNERS.popup_points],
    popup_cta_text: str(r.popup_cta_text).trim().slice(0, 40) || EMPTY_BANNERS.popup_cta_text,
    popup_cta_link: cleanBannerLink(r.popup_cta_link) || "#flash-deals",
    popup_dismiss_text: str(r.popup_dismiss_text).trim().slice(0, 40) || EMPTY_BANNERS.popup_dismiss_text,
    popup_delay_sec: clampSec(r.popup_delay_sec, 0, 30, 1),
    popup_autoclose_sec: clampSec(r.popup_autoclose_sec, 0, 120, 0),
    popup_kicker: str(r.popup_kicker).trim().slice(0, 40) || EMPTY_BANNERS.popup_kicker,
    popup_show_kicker: typeof r.popup_show_kicker === "boolean" ? r.popup_show_kicker : true,
    popup_show_title: typeof r.popup_show_title === "boolean" ? r.popup_show_title : true,
    popup_show_message: typeof r.popup_show_message === "boolean" ? r.popup_show_message : true,
    popup_show_points: typeof r.popup_show_points === "boolean" ? r.popup_show_points : true,
    popup_show_dismiss: typeof r.popup_show_dismiss === "boolean" ? r.popup_show_dismiss : true,
    popup_style: (POPUP_STYLES.some((s) => s.id === r.popup_style) ? r.popup_style : "dark") as PopupStyle,
    popup_size: (POPUP_SIZES.some((s) => s.id === r.popup_size) ? r.popup_size : "md") as PopupSize,
    popup_mode: (POPUP_MODES.some((m) => m.id === r.popup_mode) ? r.popup_mode : "card") as PopupMode,
    popup_frequency: (POPUP_FREQUENCIES.some((f) => f.id === r.popup_frequency) ? r.popup_frequency : "every") as PopupFrequency,
    // New list wins; legacy rows (no key yet) migrate the flat popup_*
    // fields into a single "Welcome popup" campaign on first read.
    popup_campaigns:
      r.popup_campaigns === undefined
        ? [
            {
              ...defaultPopupCampaign("Welcome popup"),
              id: "default",
              enabled: typeof r.popup_enabled === "boolean" ? r.popup_enabled : true,
              mode: (POPUP_MODES.some((m) => m.id === r.popup_mode) ? r.popup_mode : "card") as PopupMode,
              image: str(r.popup_image).trim(),
              kicker: str(r.popup_kicker).trim().slice(0, 40) || EMPTY_BANNERS.popup_kicker,
              show_kicker: typeof r.popup_show_kicker === "boolean" ? r.popup_show_kicker : true,
              title: str(r.popup_title).trim().slice(0, 80) || EMPTY_BANNERS.popup_title,
              show_title: typeof r.popup_show_title === "boolean" ? r.popup_show_title : true,
              message: str(r.popup_message).trim().slice(0, 200) || EMPTY_BANNERS.popup_message,
              show_message: typeof r.popup_show_message === "boolean" ? r.popup_show_message : true,
              points: popup_points.length > 0 ? popup_points : [...EMPTY_BANNERS.popup_points],
              show_points: typeof r.popup_show_points === "boolean" ? r.popup_show_points : true,
              cta_text: str(r.popup_cta_text).trim().slice(0, 40) || EMPTY_BANNERS.popup_cta_text,
              cta_link: cleanBannerLink(r.popup_cta_link) || "#flash-deals",
              dismiss_text: str(r.popup_dismiss_text).trim().slice(0, 40) || EMPTY_BANNERS.popup_dismiss_text,
              show_dismiss: typeof r.popup_show_dismiss === "boolean" ? r.popup_show_dismiss : true,
              style: (POPUP_STYLES.some((s) => s.id === r.popup_style) ? r.popup_style : "dark") as PopupStyle,
              size: (POPUP_SIZES.some((s) => s.id === r.popup_size) ? r.popup_size : "md") as PopupSize,
              frequency: (POPUP_FREQUENCIES.some((f) => f.id === r.popup_frequency) ? r.popup_frequency : "every") as PopupFrequency,
              delay_sec: clampSec(r.popup_delay_sec, 0, 30, 1),
              autoclose_sec: clampSec(r.popup_autoclose_sec, 0, 120, 0),
              start_at: "",
              end_at: "",
              countdown_end_at: cleanIsoDate(r.countdown_end_at),
            },
          ]
        : parsePopupCampaigns(r.popup_campaigns),
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
    sidebar_banners,
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

export const POPUP_STYLES = [
  { id: "dark", label: "Midnight deal (navy + red)" },
  { id: "crimson", label: "Crimson sale (red)" },
  { id: "amber", label: "Amber promo (orange)" },
  { id: "light", label: "Clean light (white)" },
] as const

export type PopupStyle = (typeof POPUP_STYLES)[number]["id"]

export const POPUP_SIZES = [
  { id: "sm", label: "Compact" },
  { id: "md", label: "Standard" },
  { id: "lg", label: "Wide" },
] as const

export type PopupSize = (typeof POPUP_SIZES)[number]["id"]

export const POPUP_MODES = [
  { id: "card", label: "Card — image + writeup + buttons" },
  { id: "banner", label: "Banner — your uploaded image only" },
] as const

export type PopupMode = (typeof POPUP_MODES)[number]["id"]

export const POPUP_FREQUENCIES = [
  { id: "every", label: "Every visit" },
  { id: "session", label: "Once per session (per tab)" },
  { id: "twice", label: "Twice a day" },
  { id: "daily", label: "Once a day" },
  { id: "weekly", label: "Once a week" },
] as const

export type PopupFrequency = (typeof POPUP_FREQUENCIES)[number]["id"]

export interface PopupCampaign {
  id: string
  name: string
  enabled: boolean
  mode: PopupMode
  image: string
  kicker: string
  show_kicker: boolean
  title: string
  show_title: boolean
  message: string
  show_message: boolean
  points: string[]
  show_points: boolean
  cta_text: string
  cta_link: string
  dismiss_text: string
  show_dismiss: boolean
  style: PopupStyle
  size: PopupSize
  frequency: PopupFrequency
  delay_sec: number
  autoclose_sec: number
  /** ISO datetimes; "" = no bound. Lets campaigns run on schedule. */
  start_at: string
  end_at: string
  /** Optional urgency timer shown inside the popup ("Ends in 04:12:33",
      like big-brand sale popups). "" = no timer. */
  countdown_end_at: string
}

export const MAX_POPUP_CAMPAIGNS = 10

export function defaultPopupCampaign(name = "New popup"): PopupCampaign {
  return {
    id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    name: name.slice(0, 60) || "New popup",
    enabled: true,
    mode: "card",
    image: "",
    kicker: EMPTY_BANNERS.popup_kicker,
    show_kicker: true,
    title: EMPTY_BANNERS.popup_title,
    show_title: true,
    message: EMPTY_BANNERS.popup_message,
    show_message: true,
    points: [...EMPTY_BANNERS.popup_points],
    show_points: true,
    cta_text: EMPTY_BANNERS.popup_cta_text,
    cta_link: "#flash-deals",
    dismiss_text: EMPTY_BANNERS.popup_dismiss_text,
    show_dismiss: true,
    style: "dark",
    size: "md",
    // New campaigns show every visit by default so they are immediately
    // visible (and rotate fairly with the rest). Switch to daily/weekly
    // per campaign to pace them — otherwise a single test-close hides a
    // daily campaign for 24h and looks "broken".
    frequency: "every",
    delay_sec: 1,
    autoclose_sec: 0,
    start_at: "",
    end_at: "",
    countdown_end_at: "",
  }
}

// datetime-local inputs speak LOCAL wall time while we store UTC ISO.
// Format stored UTC -> local "YYYY-MM-DDTHH:MM" for display so the shown
// time never drifts by the timezone offset on every view/save round-trip.
export function isoToLocalInput(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ""
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function cleanIsoDate(v: unknown): string {
  if (typeof v !== "string" || !v.trim()) return ""
  const ms = Date.parse(v.trim())
  return Number.isFinite(ms) ? new Date(ms).toISOString() : ""
}

// #RGB / #RRGGBB only — anything else falls back (never inject raw
// admin text into a style attribute).
function cleanHex(v: unknown, fb: string): string {
  if (typeof v !== "string") return fb
  const t = v.trim()
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(t) ? t : fb
}

const clampSec = (v: unknown, lo: number, hi: number, fb: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : fb
}

function parsePopupCampaign(v: unknown): PopupCampaign | null {
  if (!v || typeof v !== "object") return null
  const r = v as Record<string, unknown>
  const str = (x: unknown) => (typeof x === "string" ? x : "")
  const pts = Array.isArray(r.points) ? r.points : []
  const points = pts
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim().slice(0, 120))
    .slice(0, 3)
  const c = defaultPopupCampaign(str(r.name) || "Popup")
  const bool = (x: unknown, fb: boolean) => (typeof x === "boolean" ? x : fb)
  return {
    ...c,
    id: /^[A-Za-z0-9_-]{1,40}$/.test(str(r.id)) ? str(r.id) : c.id,
    name: str(r.name).trim().slice(0, 60) || "Popup",
    enabled: bool(r.enabled, true),
    mode: (POPUP_MODES.some((m) => m.id === r.mode) ? r.mode : "card") as PopupMode,
    image: str(r.image).trim(),
    kicker: str(r.kicker).trim().slice(0, 40) || EMPTY_BANNERS.popup_kicker,
    show_kicker: bool(r.show_kicker, true),
    title: str(r.title).trim().slice(0, 80) || EMPTY_BANNERS.popup_title,
    show_title: bool(r.show_title, true),
    message: str(r.message).trim().slice(0, 200) || EMPTY_BANNERS.popup_message,
    show_message: bool(r.show_message, true),
    points: points.length > 0 ? points : [...EMPTY_BANNERS.popup_points],
    show_points: bool(r.show_points, true),
    cta_text: str(r.cta_text).trim().slice(0, 40) || EMPTY_BANNERS.popup_cta_text,
    cta_link: cleanBannerLink(r.cta_link) || "#flash-deals",
    dismiss_text: str(r.dismiss_text).trim().slice(0, 40) || EMPTY_BANNERS.popup_dismiss_text,
    show_dismiss: bool(r.show_dismiss, true),
    style: (POPUP_STYLES.some((s) => s.id === r.style) ? r.style : "dark") as PopupStyle,
    size: (POPUP_SIZES.some((s) => s.id === r.size) ? r.size : "md") as PopupSize,
    frequency: (POPUP_FREQUENCIES.some((f) => f.id === r.frequency) ? r.frequency : "every") as PopupFrequency,
    delay_sec: clampSec(r.delay_sec, 0, 30, 1),
    autoclose_sec: clampSec(r.autoclose_sec, 0, 120, 0),
    start_at: cleanIsoDate(r.start_at),
    end_at: cleanIsoDate(r.end_at),
    countdown_end_at: cleanIsoDate(r.countdown_end_at),
  }
}

export function parsePopupCampaigns(v: unknown): PopupCampaign[] {
  if (!Array.isArray(v)) return []
  const out: PopupCampaign[] = []
  const seen = new Set<string>()
  for (const x of v) {
    if (out.length >= MAX_POPUP_CAMPAIGNS) break
    const c = parsePopupCampaign(x)
    if (c && !seen.has(c.id)) {
      seen.add(c.id)
      out.push(c)
    }
  }
  return out
}

const POP_FREQ_PREFIX = "tp_market_popup_v1"

// Shopper-local calendar day (YYYY-MM-DD) — twice-daily caps reset at
// local midnight, matching how a shopper experiences "per day".
function todayKey(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Frequency cap so shoppers don't see a popup on every refresh.
// Remembered per campaign on the shopper's device (session tab or
// local day/week stamp). Server-safe: returns true without storage.
export function popupDue(frequency: string, id: string): boolean {
  try {
    if (typeof window === "undefined") return true
    if (frequency === "every") return true
    const key = `${POP_FREQ_PREFIX}:${id}`
    if (frequency === "session") return !window.sessionStorage.getItem(key)
    if (frequency === "twice") {
      const raw = window.localStorage.getItem(key)
      if (!raw) return true
      try {
        const o = JSON.parse(raw) as { d?: string; n?: number }
        // Legacy plain-timestamp stamps (or any other shape) count as a
        // fresh day — the next stamp rewrites them in the new shape.
        if (!o || o.d !== todayKey()) return true
        return (o.n || 0) < 2
      } catch {
        return true
      }
    }
    const last = Number(window.localStorage.getItem(key) || 0)
    const gap = frequency === "weekly" ? 7 * 86400000 : 86400000
    return Date.now() - last > gap
  } catch {
    return true
  }
}

export function stampPopup(frequency: string, id: string) {
  try {
    if (typeof window === "undefined") return
    const key = `${POP_FREQ_PREFIX}:${id}`
    if (frequency === "session") {
      window.sessionStorage.setItem(key, "1")
      return
    }
    if (frequency === "twice") {
      const today = todayKey()
      let n = 1
      try {
        const raw = window.localStorage.getItem(key)
        if (raw) {
          const o = JSON.parse(raw) as { d?: string; n?: number }
          if (o && o.d === today) n = (o.n || 0) + 1
        }
      } catch {
        // corrupted stamp — restart the count
      }
      window.localStorage.setItem(key, JSON.stringify({ d: today, n }))
      return
    }
    window.localStorage.setItem(key, String(Date.now()))
  } catch {
    // private mode — popup simply shows again next visit
  }
}

const POP_LAST_KEY = "tp_market_popup_last_v1"

function readLastShown(): string | null {
  try {
    if (typeof window === "undefined") return null
    return window.localStorage.getItem(POP_LAST_KEY)
  } catch {
    return null
  }
}

// Remembered when a popup is actually SHOWN (not on every pick, so
// background data refreshes can never advance the rotation). Exported
// for the storefront; tests pass lastShown explicitly instead.
export function markPopupShown(id: string) {
  try {
    if (typeof window === "undefined") return
    window.localStorage.setItem(POP_LAST_KEY, id)
  } catch {
    // private mode — rotation simply restarts next visit
  }
}

// Conflict-free selection with fair rotation: among the campaigns that
// are enabled, inside their schedule window, and due under their own
// frequency cap, walk the admin order starting AFTER the one shown last
// (wrapping around). So several always-due campaigns take turns instead
// of the top one shadowing the rest forever. Only ever one popup per
// visit — never stacked.
export function pickPopupCampaign(
  list: PopupCampaign[],
  now = Date.now(),
  lastShown?: string | null
): PopupCampaign | null {
  const inWindow = list.filter((c) => {
    if (!c.enabled) return false
    if (c.start_at && now < Date.parse(c.start_at)) return false
    if (c.end_at && now > Date.parse(c.end_at)) return false
    return true
  })
  const due = inWindow.filter((c) => popupDue(c.frequency, c.id))
  if (due.length === 0) return null
  if (due.length === 1) return due[0]
  const last = lastShown !== undefined ? lastShown : readLastShown()
  const order = list.map((c) => c.id)
  const startIdx = last ? order.indexOf(last) : -1
  for (let k = 1; k <= order.length; k++) {
    const id = order[(startIdx + k + order.length) % order.length]
    const hit = due.find((c) => c.id === id)
    if (hit) return hit
  }
  return due[0]
}

export interface PopupStatRow {
  campaign_id: string
  event: "view" | "click" | "close"
  created_at: string
}

export interface PopupStatSummary {
  views: number
  clicks: number
  closes: number
  ctr: number
  lastShownAt: string | null
}

// Pure aggregation for the admin analytics view: totals + CTR per
// campaign over any set of raw stat rows.
export function summarizePopupStats(rows: PopupStatRow[]): Record<string, PopupStatSummary> {
  const out: Record<string, PopupStatSummary> = {}
  for (const r of rows) {
    if (!r || typeof r.campaign_id !== "string" || !r.campaign_id) continue
    const s = out[r.campaign_id] || { views: 0, clicks: 0, closes: 0, ctr: 0, lastShownAt: null }
    if (r.event === "view") s.views += 1
    else if (r.event === "click") s.clicks += 1
    else if (r.event === "close") s.closes += 1
    else continue
    if (r.event === "view" && typeof r.created_at === "string") {
      if (!s.lastShownAt || r.created_at > s.lastShownAt) s.lastShownAt = r.created_at
    }
    out[r.campaign_id] = s
  }
  for (const s of Object.values(out)) {
    s.ctr = s.views > 0 ? Math.round((s.clicks / s.views) * 1000) / 10 : 0
  }
  return out
}

// Adapter: a campaign viewed through the legacy flat popup fields,
// so the shared card component needs no changes.
export function campaignView(c: PopupCampaign): MarketBanners {
  return {
    ...EMPTY_BANNERS,
    departments: {},
    sidebar_banners: {},
    links: {},
    slot_settings: {},
    popup_enabled: c.enabled,
    popup_image: c.image,
    popup_title: c.title,
    popup_message: c.message,
    popup_points: [...c.points],
    popup_cta_text: c.cta_text,
    popup_cta_link: c.cta_link,
    popup_dismiss_text: c.dismiss_text,
    popup_delay_sec: c.delay_sec,
    popup_autoclose_sec: c.autoclose_sec,
    popup_kicker: c.kicker,
    popup_show_kicker: c.show_kicker,
    popup_show_title: c.show_title,
    popup_show_message: c.show_message,
    popup_show_points: c.show_points,
    popup_show_dismiss: c.show_dismiss,
    popup_style: c.style,
    popup_size: c.size,
    popup_mode: c.mode,
    popup_frequency: c.frequency,
  }
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

// Flash-sale countdown: seconds left until the admin's end datetime.
// Past / invalid / empty end = 0 (caller falls back to a rolling window).
export function flashSecondsLeft(endAt: string | null | undefined, now = Date.now()): number {
  if (!endAt) return 0
  const ms = Date.parse(endAt)
  if (!Number.isFinite(ms)) return 0
  return Math.max(0, Math.floor((ms - now) / 1000))
}

export function splitCountdown(totalSec: number): { days: string; hrs: string; mins: string; secs: string } {
  const s = Math.max(0, Math.floor(totalSec))
  const p = (n: number) => String(n).padStart(2, "0")
  return {
    days: p(Math.floor(s / 86400)),
    hrs: p(Math.floor((s % 86400) / 3600)),
    mins: p(Math.floor((s % 3600) / 60)),
    secs: p(s % 60),
  }
}
