// TechPivo Market — mobile homepage banners.
// Stored in site_settings under key "marketplace_mobile_banners", completely
// independent of the desktop banner system (marketplace_banners). The desktop
// homepage keeps showing its existing desktop banners untouched.
//
export const MARKETPLACE_MOBILE_BANNERS_KEY = "marketplace_mobile_banners"

export interface MobileBanner {
  id: string
  name: string // admin-visible label
  image: string // public image URL
  link: string // destination (in-store path, #anchor or https) — "" = not clickable
  enabled: boolean
  order: number // display order (lowest first)
}

export const EMPTY_MOBILE_BANNERS: Array<MobileBanner> = []

function nextId(): string {
  return `mb-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function parseMobileBanners(raw: unknown): Array<MobileBanner> {
  if (!raw || !Array.isArray(raw)) return EMPTY_MOBILE_BANNERS
  const out: Array<MobileBanner> = []
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

export function sanitizeMobileBanners(list: Array<MobileBanner>): Array<MobileBanner> {
  return list
    .map((b, i) => ({
      ...b,
      order: Number.isFinite(b.order) ? b.order : i,
      name: b.name.trim() || `Mobile banner ${i + 1}`,
    }))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
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

export function mobileBannerLinkLabel(value: string): string {
  if (!value) return "No link"
  return value
}
