// TechPivo Market — mobile homepage banners.
// Stored in site_settings under key "marketplace_mobile_banners", completely
// independent of the desktop banner system (marketplace_banners). The desktop
// homepage keeps showing its existing desktop banners untouched.
//
// Storage format (object, new):
//   {
//     banners: MobileBanner[],
//     transition: MobileBannerTransition,
//     upload: MobileBannerUploadConfig
//   }
//
// Backward compatible: if the stored value is still a plain array (old
// format from Section 5a / earlier), it is treated as a banner list with
// default transition + upload settings.
//
export const MARKETPLACE_MOBILE_BANNERS_KEY = "marketplace_mobile_banners"

export const MOBILE_BANNER_DEFAULT_WIDTH = 1080
export const MOBILE_BANNER_DEFAULT_HEIGHT = 450
export const MOBILE_BANNER_DEFAULT_ASPECT_RATIO = 2.4 // 1080 / 450
export const MOBILE_BANNER_DEFAULT_MAX_FILE_SIZE_MB = 2
export const MOBILE_BANNER_DEFAULT_QUALITY = 0.85

export const MOBILE_BANNER_ACCEPTED_FORMATS = ["image/jpeg", "image/png", "image/webp"] as const
export type MobileBannerFormat = (typeof MOBILE_BANNER_ACCEPTED_FORMATS)[number]

export type MobileBannerTransitionEffect = "slide" | "fade"

export interface MobileBanner {
  id: string
  name: string // admin-visible label
  image: string // public image URL
  link: string // destination (in-store path, #anchor or https) — "" = not clickable
  enabled: boolean
  order: number // display order (lowest first)
}

export interface MobileBannerTransition {
  autoplay: boolean
  intervalSec: number // seconds between auto-slides
  durationMs: number // transition duration in ms
  effect: MobileBannerTransitionEffect // "slide" | "fade"
  showArrows: boolean
  showDots: boolean
  pauseOnInteraction: boolean
}

export interface MobileBannerUploadConfig {
  maxFileSizeMB: number
  acceptedFormats: MobileBannerFormat[]
  recommendedWidth: number
  recommendedHeight: number
  aspectRatio: number
  quality: number
}

export interface MobileBannerSettings {
  banners: MobileBanner[]
  transition: MobileBannerTransition
  upload: MobileBannerUploadConfig
}

export const EMPTY_MOBILE_BANNERS: MobileBanner[] = []

export const DEFAULT_MOBILE_BANNER_TRANSITION: MobileBannerTransition = {
  autoplay: true,
  intervalSec: 5,
  durationMs: 400,
  effect: "slide",
  showArrows: true,
  showDots: true,
  pauseOnInteraction: true,
}

export const DEFAULT_MOBILE_BANNER_UPLOAD: MobileBannerUploadConfig = {
  maxFileSizeMB: MOBILE_BANNER_DEFAULT_MAX_FILE_SIZE_MB,
  acceptedFormats: [...MOBILE_BANNER_ACCEPTED_FORMATS],
  recommendedWidth: MOBILE_BANNER_DEFAULT_WIDTH,
  recommendedHeight: MOBILE_BANNER_DEFAULT_HEIGHT,
  aspectRatio: MOBILE_BANNER_DEFAULT_ASPECT_RATIO,
  quality: MOBILE_BANNER_DEFAULT_QUALITY,
}

export const EMPTY_MOBILE_BANNER_SETTINGS: MobileBannerSettings = {
  banners: [],
  transition: { ...DEFAULT_MOBILE_BANNER_TRANSITION },
  upload: { ...DEFAULT_MOBILE_BANNER_UPLOAD },
}

function nextId(): string {
  return `mb-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

// Destination allowlist: in-store paths, #anchors and https links.
function cleanLink(v: unknown): string {
  if (typeof v !== "string") return ""
  const t = v.trim().slice(0, 500)
  if (!t || /\s/.test(t)) return ""
  if (t === "/" || t.startsWith("#")) return t
  if (t.startsWith("/") && !t.startsWith("//")) return t
  if (/^https?:\/\//i.test(t)) return t
  return ""
}

/** Parse an array of raw banner objects into MobileBanner[]. Backward compatible. */
export function parseMobileBannerList(raw: unknown): MobileBanner[] {
  if (!raw || !Array.isArray(raw)) return EMPTY_MOBILE_BANNERS
  const out: MobileBanner[] = []
  const seen = new Set<string>()
  for (const x of raw) {
    if (!x || typeof x !== "object") continue
    const r = x as Record<string, unknown>
    const id =
      typeof r.id === "string" && r.id.trim()
        ? r.id.trim()
        : nextId()
    if (seen.has(id)) continue
    seen.add(id)
    const image = typeof r.image === "string" ? r.image.trim() : ""
    const link = cleanLink(typeof r.link === "string" ? r.link : "")
    const enabled = typeof r.enabled === "boolean" ? r.enabled : true
    const order = Number.isFinite(Number(r.order)) ? Math.round(Number(r.order)) : 0
    const name =
      typeof r.name === "string" && r.name.trim()
        ? r.name.trim().slice(0, 60)
        : `Mobile banner ${out.length + 1}`
    out.push({ id, name, image, link, enabled, order })
  }
  out.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  return out
}

/** Sanitise a banner list, filling in defaults. */
export function sanitizeMobileBannerList(list: MobileBanner[]): MobileBanner[] {
  return list
    .map((b, i) => ({
      ...b,
      order: Number.isFinite(b.order) ? b.order : i,
      name: b.name.trim() || `Mobile banner ${i + 1}`,
    }))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}

/** Parse raw site_settings value into full MobileBannerSettings. Handles both
 *  the new object format and the legacy array format. */
export function parseMobileBanners(raw: unknown): MobileBannerSettings {
  // Legacy array format — just banners, defaults for transition + upload.
  if (Array.isArray(raw)) {
    return {
      banners: parseMobileBannerList(raw),
      transition: { ...DEFAULT_MOBILE_BANNER_TRANSITION },
      upload: { ...DEFAULT_MOBILE_BANNER_UPLOAD },
    }
  }

  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_MOBILE_BANNER_SETTINGS }
  }

  const r = raw as Record<string, unknown>

  const bannersRaw = r.banners
  const banners = Array.isArray(bannersRaw) ? parseMobileBannerList(bannersRaw) : EMPTY_MOBILE_BANNERS

  const transRaw = r.transition && typeof r.transition === "object" ? (r.transition as Record<string, unknown>) : {}
  const transition: MobileBannerTransition = {
    autoplay: typeof transRaw.autoplay === "boolean" ? transRaw.autoplay : DEFAULT_MOBILE_BANNER_TRANSITION.autoplay,
    intervalSec: Number.isFinite(Number(transRaw.intervalSec)) && Number(transRaw.intervalSec) > 0
      ? Math.round(Number(transRaw.intervalSec))
      : DEFAULT_MOBILE_BANNER_TRANSITION.intervalSec,
    durationMs: Number.isFinite(Number(transRaw.durationMs)) && Number(transRaw.durationMs) > 0
      ? Math.round(Number(transRaw.durationMs))
      : DEFAULT_MOBILE_BANNER_TRANSITION.durationMs,
    effect: (transRaw.effect === "slide" || transRaw.effect === "fade")
      ? (transRaw.effect as MobileBannerTransitionEffect)
      : DEFAULT_MOBILE_BANNER_TRANSITION.effect,
    showArrows: typeof transRaw.showArrows === "boolean" ? transRaw.showArrows : DEFAULT_MOBILE_BANNER_TRANSITION.showArrows,
    showDots: typeof transRaw.showDots === "boolean" ? transRaw.showDots : DEFAULT_MOBILE_BANNER_TRANSITION.showDots,
    pauseOnInteraction: typeof transRaw.pauseOnInteraction === "boolean" ? transRaw.pauseOnInteraction : DEFAULT_MOBILE_BANNER_TRANSITION.pauseOnInteraction,
  }

  const upRaw = r.upload && typeof r.upload === "object" ? (r.upload as Record<string, unknown>) : {}
  const upload: MobileBannerUploadConfig = {
    maxFileSizeMB: Number.isFinite(Number(upRaw.maxFileSizeMB)) && Number(upRaw.maxFileSizeMB) > 0
      ? Math.round(Number(upRaw.maxFileSizeMB))
      : DEFAULT_MOBILE_BANNER_UPLOAD.maxFileSizeMB,
    acceptedFormats: Array.isArray(upRaw.acceptedFormats) && upRaw.acceptedFormats.length > 0
      ? upRaw.acceptedFormats.filter((f): f is MobileBannerFormat =>
          MOBILE_BANNER_ACCEPTED_FORMATS.includes(f as MobileBannerFormat))
      : [...DEFAULT_MOBILE_BANNER_UPLOAD.acceptedFormats],
    recommendedWidth: Number.isFinite(Number(upRaw.recommendedWidth)) && Number(upRaw.recommendedWidth) > 0
      ? Math.round(Number(upRaw.recommendedWidth))
      : DEFAULT_MOBILE_BANNER_UPLOAD.recommendedWidth,
    recommendedHeight: Number.isFinite(Number(upRaw.recommendedHeight)) && Number(upRaw.recommendedHeight) > 0
      ? Math.round(Number(upRaw.recommendedHeight))
      : DEFAULT_MOBILE_BANNER_UPLOAD.recommendedHeight,
    aspectRatio: Number.isFinite(Number(upRaw.aspectRatio)) && Number(upRaw.aspectRatio) > 0
      ? Number(upRaw.aspectRatio)
      : DEFAULT_MOBILE_BANNER_UPLOAD.aspectRatio,
    quality: Number.isFinite(Number(upRaw.quality)) && Number(upRaw.quality) > 0 && Number(upRaw.quality) <= 1
      ? Number(upRaw.quality)
      : DEFAULT_MOBILE_BANNER_UPLOAD.quality,
  }

  return { banners, transition, upload }
}

/** Sanitise full settings, filling in defaults. */
export function sanitizeMobileBanners(settings: MobileBannerSettings): MobileBannerSettings {
  return {
    banners: sanitizeMobileBannerList(settings.banners),
    transition: {
      ...DEFAULT_MOBILE_BANNER_TRANSITION,
      ...settings.transition,
    },
    upload: {
      ...DEFAULT_MOBILE_BANNER_UPLOAD,
      ...settings.upload,
    },
  }
}

// Extension helpers for the allowed file extensions (from MIME types).
export function mobileBannerAllowedExtensions(formats?: MobileBannerFormat[]): string[] {
  const list = formats || MOBILE_BANNER_ACCEPTED_FORMATS
  return list.map((f) => f.split("/")[1] || "")
}

// Destination allowlist label helper.
export function mobileBannerLinkLabel(value: string): string {
  if (!value) return "No link"
  return value
}
