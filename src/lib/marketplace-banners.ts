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
}

// Recommended upload dimensions — shown in Admin so uploads fit well.
export const BANNER_SLOTS = [
  {
    id: "hero_image",
    label: "Homepage hero (main left banner)",
    dims: "1600 × 640 px (2.5:1 wide — min 1200 × 480)",
    hint: "Fills the full left 2/3 banner edge to edge (desktop ~935 × 400, object-cover: crops sides on odd ratios, never leaves gaps). Use a 2.5:1-wide image. Clear it to bring the default hero back.",
  },
  {
    id: "promo_image",
    label: "Promo banner",
    dims:  "1600 × 500 px",
    hint: "Wide strip above the brand row. Text overlays the left side — use a calm right edge.",
  },
  {
    id: "promo_deals_image",
    label: "Hero side promo — Deals (red, top right)",
    dims: "900 × 390 px (2.3:1 wide — min 600 × 260)",
    hint: "Fills the red 'Mega Deal' box (top half of the right 1/3 column, desktop ~450 × 192). Image is cropped to fill — text stays readable over a dark scrim.",
  },
  {
    id: "promo_new_image",
    label: "Hero side promo — New arrivals (orange, bottom right)",
    dims: "900 × 390 px (2.3:1 wide — min 600 × 260)",
    hint: "Fills the orange 'New Season' box (bottom half of the right 1/3 column, desktop ~450 × 192). Image is cropped to fill — text stays readable over a dark scrim.",
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
  const deps = r.departments && typeof r.departments === "object" ? (r.departments as Record<string, unknown>) : {}
  const departments: Record<string, string> = {}
  for (const [k, v] of Object.entries(deps)) {
    if (typeof v === "string" && v.trim()) departments[k] = v.trim()
  }
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
    departments,
  }
}
