// TechPivo Market storefront image + text helpers — supplier hostnames and
// sourcing traces must never appear in the rendered page (src, hover,
// view-source). Isomorphic (safe in server + client components).

function encodeRef(src: string): string {
  // base64url of the utf-8 bytes — btoa exists in browsers and Node 16+.
  const bytes = new TextEncoder().encode(encodeURIComponent(src))
  let bin = ""
  bytes.forEach((b) => {
    bin += String.fromCharCode(b)
  })
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function marketImage(src: string | null | undefined): string {
  if (!src) return ""
  if (src.startsWith("/api/market-image")) return src
  try {
    const u = new URL(src)
    if (u.protocol === "https:" && /\.cjdropshipping\.com$/i.test(u.hostname)) {
      return `/api/market-image?t=${encodeRef(src)}`
    }
  } catch {
    // relative path or invalid URL — render as-is
  }
  return src
}

// Strip supplier/sourcing traces from supplier-provided copy (descriptions
// often arrive as "CJ Category / Sub" breadcrumbs).
export function cleanSupplierText(text: string | null | undefined): string {
  if (!text) return ""
  return text
    .replace(/https?:\/\/[^\s]*cjdropshipping[^\s]*/gi, "")
    .replace(/\bcj[\s–—:\-]+/gi, "")
    .replace(/\bcjdropshipping\b/gi, "TechPivo Market")
    .replace(/\bdropship(?:ping|ped)?\b/gi, "order fulfilment")
    .replace(/\s{2,}/g, " ")
    .trim()
}
