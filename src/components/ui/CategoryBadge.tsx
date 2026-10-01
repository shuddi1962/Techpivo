/** Darken a 6-digit hex color so it passes 4.5:1 body-text contrast on
 *  white card backgrounds. Category brand colors (#F59E0B, #EC4899, …) all
 *  fail as body text on white — every card badge on the site was flagging
 *  the PageSpeed "Contrast" audit. Non-hex values fall back to dark amber. */
function badgeTextColor(color: string | undefined): string {
  const fallback = "#B45309"
  if (!color) return fallback
  const m = /^#([0-9a-f]{6})$/i.exec(color.trim())
  if (!m) return fallback
  const n = parseInt(m[1], 16)
  const f = 0.65
  const r = Math.round(((n >> 16) & 255) * f)
  const g = Math.round(((n >> 8) & 255) * f)
  const b = Math.round((n & 255) * f)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}

export function CategoryBadge({
  name,
  color,
  size = "md",
  tone = "light",
}: {
  name?: string
  color?: string
  size?: "xs" | "sm" | "md"
  /** "light" = darkened text for white cards; "dark" = original bright color for dark/photo backgrounds. */
  tone?: "light" | "dark"
}) {
  if (!name) return null
  const sizes = { xs: "9px", sm: "10px", md: "11px" }
  return (
    <span
      className="font-semibold uppercase tracking-wider inline-block"
      style={{
        fontSize: sizes[size],
        color: tone === "dark" ? color || "#FBBF24" : badgeTextColor(color),
      }}
    >
      {name}
    </span>
  )
}
