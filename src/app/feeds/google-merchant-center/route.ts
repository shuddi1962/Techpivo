import { NextRequest, NextResponse } from "next/server"
import { createPublicClient } from "@/lib/supabase/server"
import { fetchWithTimeout } from "@/lib/fetch-timeout"
import { SITE_URL } from "@/lib/constants"

export const dynamic = "force-dynamic"
export const revalidate = 60 * 60 // refresh hourly; product changes re-validate via admin

// RSS 2.0 + Google Merchant Center attributes (g: namespace).
// Format: https://support.google.com/merchants/answer/6073848
const RSS_VERSION = "2.0"
const G_NS = "xmlns:g=\"http://base.google.com/ns/1.0\""

const DEFAULT_LIMIT = 5000 // raised to match MAX_LIMIT; single feed stays fast via range
const MAX_LIMIT = 5000

function xmlEscape(value: string | null | undefined): string {
  if (value == null) return ""
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function toAbsolute(url?: string | null): string | null {
  if (!url) return null
  const u = url.trim()
  if (/^https?:\/\//i.test(u)) return u
  if (u.startsWith("//")) return `https:${u}`
  if (u.startsWith("/")) return `${SITE_URL}${u}`
  return `${SITE_URL}/${u}`
}

function toTwoDecimals(n: number | null | undefined): string {
  const v = Number(n ?? 0)
  if (!Number.isFinite(v) || v <= 0) return "0.00"
  return v.toFixed(2)
}

function availabilityFor(stock: number | null | undefined): string {
  const s = Number(stock ?? 0)
  if (!Number.isFinite(s) || s <= 0) return "out_of_stock"
  return "in_stock"
}

// Best-effort map from our department/subcategory slugs to a free-form
// product_type path. google_product_category is deliberately omitted unless
// we have a confident mapping to Google's published taxonomy IDs — guessing
// an ID violates Google policy.
function productType(categorySlug?: string | null, subcategorySlug?: string | null): string | null {
  const parts: string[] = []
  if (categorySlug) parts.push(categorySlug.replace(/-/g, " "))
  if (subcategorySlug) parts.push(subcategorySlug.replace(/-/g, " "))
  return parts.length ? parts.join(" > ") : null
}

function brandName(cjData: unknown): string {
  if (cjData && typeof cjData === "object") {
    const b = (cjData as { brand?: string }).brand
    if (typeof b === "string" && b.trim()) return b.trim()
  }
  return "TechPivo Market"
}

// Google Merchant Center requires a stable, unique id. Prefer the CJ product
// id (cj_pid) — it never changes for a given supplier product — then fall
// back to the internal store id.
function feedId(cjPid?: string | null, id?: string): string {
  if (cjPid && String(cjPid).trim()) return `cj-${String(cjPid).trim()}`
  return `tp-${String(id ?? "")}`
}

export async function GET(request: NextRequest) {
  const supabase = createPublicClient()
  const url = new URL(request.url)
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT), 1),
    MAX_LIMIT
  )
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0)

  let generated = 0
  let skipped = 0
  let lastError: string | null = null
  let products: Array<{
    id: string
    product_name: string
    product_description: string | null
    product_image_url: string | null
    original_price: number | null
    sale_price: number | null
    category_slug: string | null
    subcategory_slug: string | null
    leaf_slug: string | null
    stock: number | null
    cj_data: unknown
    cj_pid: string | null
    cj_sku: string | null
    created_at: string | null
  }> = []

  try {
    const res = (await fetchWithTimeout(
      supabase
        .from("affiliate_products")
        .select(
          "id,product_name,product_description,product_image_url,original_price,sale_price,category_slug,subcategory_slug,leaf_slug,stock,cj_data,cj_pid,cj_sku,created_at"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1),
      25000
    )) as {
      data: Array<{
        id: string
        product_name: string
        product_description: string | null
        product_image_url: string | null
        original_price: number | null
        sale_price: number | null
        category_slug: string | null
        subcategory_slug: string | null
        leaf_slug: string | null
        stock: number | null
        cj_data: unknown
        cj_pid: string | null
        cj_sku: string | null
        created_at: string | null
      }> | null
      error: { message: string } | null
    } | null

    if (res?.error) {
      lastError = res.error.message
    } else {
      products = res?.data ?? []
    }
  } catch (e) {
    lastError = e instanceof Error ? e.message : "Feed generation failed"
    console.error("[google-merchant-center feed]", lastError)
  }

  // Build RSS channel + items.
  const channelTitle = "TechPivo Market"
  const channelDescription =
    "Curated tech products and gadgets on TechPivo Market — quality-checked, securely paid, delivered with tracking."
  const channelLink = SITE_URL
  const now = new Date().toISOString()

  const itemsXml = products
    .map((p) => {
      // Exclude listings missing essential required information per policy.
      const title = (p.product_name || "").trim()
      if (!title) {
        skipped++
        return null
      }
      const imageLink = toAbsolute(p.product_image_url)
      if (!imageLink) {
        // Image is required by Google; flag for correction rather than publish misleading data.
        skipped++
        return null
      }
      const price = p.sale_price ?? p.original_price
      if (!price || Number(price) <= 0) {
        skipped++
        return null
      }
      const link = `${SITE_URL}/marketplace/product/${p.id}`
      const id = feedId(p.cj_pid, p.id)
      const mpn = p.cj_sku || undefined
      const brand = brandName(p.cj_data)
      const type = productType(p.category_slug, p.subcategory_slug)
      const desc = (p.product_description || title).slice(0, 5000)

      generated++
      return `
  <item>
    <g:id>${xmlEscape(id)}</g:id>
    <title>${xmlEscape(title)}</title>
    <description>${xmlEscape(desc)}</description>
    <link>${xmlEscape(link)}</link>
    <g:image_link>${xmlEscape(imageLink)}</g:image_link>
    <g:availability>${availabilityFor(p.stock)}</g:availability>
    <g:price>${toTwoDecimals(price)} USD</g:price>
    <g:condition>new</g:condition>
    <g:brand>${xmlEscape(brand)}</g:brand>
    ${mpn ? `<g:mpn>${xmlEscape(mpn)}</g:mpn>` : ""}
    <g:product_type>${xmlEscape(type ?? "")}</g:product_type>
    <g:shipping>
      <g:country>US</g:country>
      <g:service>Standard</g:service>
      <g:price>5.99 USD</g:price>
    </g:shipping>
  </item>`
    })
    .filter(Boolean)

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="${RSS_VERSION}" ${G_NS}>
<channel>
  <title>${xmlEscape(channelTitle)}</title>
  <description>${xmlEscape(channelDescription)}</description>
  <link>${xmlEscape(channelLink)}</link>
  <lastBuildDate>${now}</lastBuildDate>
  ${itemsXml.join("")}
</channel>
</rss>`

  // Surface generation diagnostics server-side so the admin can see failures
  // without exposing anything to the public feed body.
  if (lastError || skipped > 0) {
    console.warn("[google-merchant-center feed]", {
      generated,
      skipped,
      lastError,
      limit,
      offset,
      timestamp: now,
    })
  }

  return new NextResponse(rss, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Feed-Generated": String(generated),
      "X-Feed-Skipped": String(skipped),
    },
  })
}
