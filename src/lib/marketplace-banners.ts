// TechPivo Market — storefront banner settings (DB-driven, admin-editable).
// Stored in site_settings under key "marketplace_banners" as JSON:
//   { hero_image, promo_image, category_default, departments: { [slug]: url } }
// Empty string = use the built-in default. All images render with
// object-cover so any aspect ratio fits without stretching.

export const MARKETPLACE_BANNERS_KEY = "marketplace_banners"

export interface MarketBanners {
  hero_image: string
  promo_image: string
  category_default: string
  departments: Record<string, string>
}

export const EMPTY_BANNERS: MarketBanners = {
  hero_image: "",
  promo_image: "",
  category_default: "",
  departments: {},
}

// Recommended upload dimensions — shown in Admin so uploads fit well.
export const BANNER_SLOTS = [
  {
    id: "hero_image",
    label: "Homepage hero",
    dims: "1600 × 900 px (min 1200 × 630)",
    hint: "Takes over the ENTIRE hero area — the navy card + side promos hide and your image shows full-width (clicks through to the collection). Clear it to bring the default hero back.",
  },
  {
    id: "promo_image",
    label: "Promo banner",
    dims:  "1600 × 500 px",
    hint: "Wide strip above the brand row. Text overlays the left side — use a calm right edge.",
  },
  {
    id: "category_default",
    label: "Category pages (default)",
    dims: "1600 × 600 px",
    hint: "Used on every department/category page banner unless that department has its own image below.",
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
    category_default: str(r.category_default).trim(),
    departments,
  }
}
