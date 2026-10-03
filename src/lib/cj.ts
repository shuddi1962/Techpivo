// CJDropshipping API client (server-side only — never import in client components)
// Docs: https://developers.cjdropshipping.com (API v2)
// Auth: POST /api2.0/v1/authentication/getAccessToken { apiKey } -> accessToken (15 days)
// Products: GET /api2.0/v1/product/list, /product/query, /product/variant/query
// Orders: POST /api2.0/v1/shopping/order/createOrder
// Key resolution: CJ_API_KEY env -> site_settings.cj_api_key -> error (demo mode)

import { createClient } from "@/lib/supabase/admin"

const CJ_BASE = "https://developers.cjdropshipping.com"
const TOKEN_CACHE_MS = 1000 * 60 * 60 * 24 * 10 // refresh after 10 days

let cachedToken = ""
let cachedAt = 0
let cachedKey = ""

export function isCjDemoMode(key: string | null | undefined) {
  return !key
}

export async function resolveCjApiKey(): Promise<string | null> {
  if (process.env.CJ_API_KEY) return process.env.CJ_API_KEY
  try {
    const supabase = createClient()
    const { data } = await supabase.from("site_settings").select("value").eq("key", "cj_api_key").maybeSingle()
    const v = (data as { value?: unknown } | null)?.value
    if (typeof v === "string" && v.trim()) return v.trim()
  } catch {
    // settings table may not exist in some envs — demo mode
  }
  return null
}

async function getAccessToken(apiKey: string): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedKey === apiKey && now - cachedAt < TOKEN_CACHE_MS) return cachedToken
  const res = await fetch(`${CJ_BASE}/api2.0/v1/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`CJ auth failed: HTTP ${res.status}`)
  const json = (await res.json()) as {
    code?: number
    message?: string
    data?: { accessToken?: string }
    result?: boolean
  }
  const token = json?.data?.accessToken
  if (json?.code !== 200 || !token) throw new Error(`CJ auth failed: ${json?.message || "no token"}`)
  cachedToken = token
  cachedAt = now
  cachedKey = apiKey
  return token
}

async function cjFetch<T>(path: string, init: RequestInit & { token: string }): Promise<T> {
  const { token, ...rest } = init
  const res = await fetch(`${CJ_BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      "CJ-Access-Token": token,
      ...(rest.headers || {}),
    },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`CJ request failed: HTTP ${res.status} (${path})`)
  const json = (await res.json()) as { code?: number; message?: string; data?: T; result?: boolean }
  if (json?.code !== 200) throw new Error(`CJ error: ${json?.message || "unknown"} (${path})`)
  return json.data as T
}

export interface CjProductSummary {
  pid: string
  productNameEn?: string
  productImage?: string
  sellPrice?: number
  productWeight?: number
  categoryFirstName?: string
  categorySecondName?: string
}

export interface CjListResult {
  list: CjProductSummary[]
  total?: number
  pageNum?: number
  pageSize?: number
}

export async function cjStatus(): Promise<{ configured: boolean; connected: boolean; message: string }> {
  const key = await resolveCjApiKey()
  if (!key) return { configured: false, connected: false, message: "CJ API key not set — demo catalog mode. Add it in Marketplace → CJ Import." }
  try {
    await getAccessToken(key)
    return { configured: true, connected: true, message: "Connected to CJDropshipping" }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Connection failed"
    return { configured: true, connected: false, message: msg }
  }
}

export async function cjListProducts(opts: {
  pageNum?: number
  pageSize?: number
  productNameEn?: string
  categoryFirstId?: string
  categorySecondId?: string
}): Promise<CjListResult> {
  const key = await resolveCjApiKey()
  if (!key) throw new Error("CJ API key not configured")
  const token = await getAccessToken(key)
  const params = new URLSearchParams({
    pageNum: String(opts.pageNum ?? 1),
    pageSize: String(Math.min(opts.pageSize ?? 20, 100)),
  })
  if (opts.productNameEn) params.set("productNameEn", opts.productNameEn)
  if (opts.categoryFirstId) params.set("categoryFirstId", opts.categoryFirstId)
  if (opts.categorySecondId) params.set("categorySecondId", opts.categorySecondId)
  return cjFetch<CjListResult>(`/api2.0/v1/product/list?${params.toString()}`, { method: "GET", token })
}

export async function cjGetProduct(pid: string): Promise<unknown> {
  const key = await resolveCjApiKey()
  if (!key) throw new Error("CJ API key not configured")
  const token = await getAccessToken(key)
  return cjFetch<unknown>(`/api2.0/v1/product/query?pid=${encodeURIComponent(pid)}`, { method: "GET", token })
}

export interface CjDetail {
  short: string
  paras: string[]
  images: string[]
  video: string
  material: string
  weightGrams: number | null
}

// Extract a clean long description + extra images + specs + video from a
// CJ product/query payload. Field names vary, so probe candidates
// defensively; always returns safe plain-text (never raw supplier HTML).
export function extractCjDetail(raw: unknown): CjDetail {
  const empty: CjDetail = { short: "", paras: [], images: [], video: "", material: "", weightGrams: null }
  if (!raw || typeof raw !== "object") return empty
  const obj = raw as Record<string, unknown>

  const pickString = (...keys: string[]): string => {
    for (const k of keys) {
      const v = obj[k]
      if (typeof v === "string" && v.trim()) return v
    }
    return ""
  }
  const html = pickString(
    "productDescriptionEn", "descriptionEn", "productDescription",
    "description", "detailEn", "detail"
  )
  // Collect embedded content images before stripping tags.
  const embedded: string[] = []
  const imgRe = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = imgRe.exec(html)) !== null) embedded.push(m[1])
  const text = html
    .replace(/<(li|p|br|h\d|tr)[^>]*>/gi, "\n")
    .replace(/<\/(li|p|h\d|tr|table|ul|ol)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
  const paras = text
    .split("\n")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 24)
    .slice(0, 30)

  const images: string[] = []
  const pushImg = (v: unknown) => {
    if (typeof v === "string" && /^https?:\/\//i.test(v)) images.push(v)
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>
      for (const k of ["productImageUrl", "imageUrl", "url", "src", "image"]) {
        if (typeof o[k] === "string" && /^https?:\/\//i.test(o[k] as string)) {
          images.push(o[k] as string)
          break
        }
      }
    }
  }
  for (const k of ["productImageSet", "detailImageList", "images", "productImages", "imageSet", "detailImages"]) {
    const v = obj[k]
    if (Array.isArray(v)) v.forEach(pushImg)
    else if (typeof v === "string") {
      v.split(/[,;|]/).forEach(pushImg)
    }
  }
  return {
    short: paras[0] ? paras[0].slice(0, 220) : "",
    paras,
    images: [...new Set([...embedded, ...images])].slice(0, 8),
    video: pickVideo(),
    material: pickMaterial(),
    weightGrams: pickWeight(),
  }

  function pickVideo(): string {
    for (const k of ["productVideo", "videoUrl", "video"]) {
      const v = obj[k]
      if (typeof v === "string" && /^https?:\/\//i.test(v)) return v
    }
    return ""
  }

  function pickMaterial(): string {
    for (const k of ["materialNameEn", "materialName", "material"]) {
      const v = obj[k]
      if (typeof v === "string" && v.trim()) return v.slice(0, 120)
      if (Array.isArray(v)) {
        const s = v.filter((x) => typeof x === "string" && x.trim()).join(", ")
        if (s) return s.slice(0, 120)
      }
    }
    return ""
  }

  function pickWeight(): number | null {
    for (const k of ["productWeight", "weight", "variantWeight", "packingWeight"]) {
      const n = Number(obj[k])
      if (Number.isFinite(n) && n > 0) return n
    }
    return null
  }
}

export interface CjVariant {
  vid?: string
  variantNameEn?: string
  variantImage?: string
  variantSellPrice?: number
  variantStock?: number
  variantSku?: string
}

export async function cjGetVariants(pid: string): Promise<CjVariant[]> {
  const key = await resolveCjApiKey()
  if (!key) throw new Error("CJ API key not configured")
  const token = await getAccessToken(key)
  const data = await cjFetch<CjVariant[] | { list?: CjVariant[]; variantList?: CjVariant[] }>(
    `/api2.0/v1/product/variant/query?pid=${encodeURIComponent(pid)}`,
    { method: "GET", token }
  )
  // CJ returns either a single variant object or a { list } wrapper.
  if (Array.isArray(data)) return data
  const d = (data || {}) as CjVariant & { list?: CjVariant[]; variantList?: CjVariant[] }
  if (d.vid) return [d]
  return d.list ?? d.variantList ?? []
}

export interface CjCategory {
  categoryFirstId?: string
  categoryFirstName?: string
  categorySecondId?: string
  categorySecondName?: string
}

export async function cjGetCategories(): Promise<CjCategory[]> {
  const key = await resolveCjApiKey()
  if (!key) throw new Error("CJ API key not configured")
  const token = await getAccessToken(key)
  const data = await cjFetch<{ list?: CjCategory[] }>(`/api2.0/v1/product/category/getCategory`, {
    method: "GET",
    token,
  })
  return data?.list ?? []
}

export interface CjFreightOption {
  logisticName?: string
  shippingFee?: number
  deliveryTime?: string
}

export async function cjGetFreight(opts: {
  startCountryCode?: string
  endCountryCode: string
  products: Array<{ vid: string; quantity: number }>
}): Promise<CjFreightOption[]> {
  const key = await resolveCjApiKey()
  if (!key) throw new Error("CJ API key not configured")
  const token = await getAccessToken(key)
  const data = await cjFetch<{ list?: CjFreightOption[] }>(`/api2.0/v1/logistic/freightCalculate`, {
    method: "POST",
    token,
    body: JSON.stringify({
      startCountryCode: opts.startCountryCode ?? "CN",
      endCountryCode: opts.endCountryCode,
      products: opts.products,
    }),
  })
  return data?.list ?? []
}

export interface CjOrderInput {
  externalOrderNumber?: string
  shippingCountry: string
  shippingAddress: string
  shippingCity: string
  shippingState?: string
  shippingZip: string
  shippingCustomerName: string
  shippingPhone: string
  logisticName: string
  products: Array<{ vid: string; quantity: number }>
  remark?: string
}

export async function cjCreateOrder(order: CjOrderInput): Promise<unknown> {
  const key = await resolveCjApiKey()
  if (!key) throw new Error("CJ API key not configured")
  const token = await getAccessToken(key)
  return cjFetch<unknown>(`/api2.0/v1/shopping/order/createOrder`, {
    method: "POST",
    token,
    body: JSON.stringify(order),
  })
}

export async function cjGetOrderDetail(cjOrderId: string): Promise<unknown> {
  const key = await resolveCjApiKey()
  if (!key) throw new Error("CJ API key not configured")
  const token = await getAccessToken(key)
  return cjFetch<unknown>(`/api2.0/v1/shopping/order/getOrderDetail?orderId=${encodeURIComponent(cjOrderId)}`, {
    method: "GET",
    token,
  })
}

/** Automation helper: search CJ and shape rows ready for affiliate_products insert */
export async function cjSyncCatalog(opts: {
  keyword: string
  limit?: number
  categorySlug?: string | null
  subcategorySlug?: string | null
}) {
  const found = await cjListProducts({
    pageNum: 1,
    pageSize: Math.min(opts.limit ?? 10, 50),
    productNameEn: opts.keyword,
  })
  return (found.list || []).map((cj) =>
    mapCjToAffiliate(cj, { categorySlug: opts.categorySlug ?? null, subcategorySlug: opts.subcategorySlug ?? null })
  )
}

/** Store pricing rule: 20% margin over CJ cost.
 *  sale = cost × 1.20, compare-at = cost × 1.50 (shows ~20% off). */
export const MARKET_MARGIN = 1.2
export const MARKET_COMPARE = 1.5

/** Freight rule: CJ courier rates + 20% markup — no separate courier key. */
export const FREIGHT_MARKUP = 1.2

export function withMargin(cost: number): number {
  return Math.round(Number(cost) * MARKET_MARGIN * 100) / 100
}

export function withFreightMarkup(fee: number): number {
  return Math.round(Number(fee) * FREIGHT_MARKUP * 100) / 100
}

export function mapCjToAffiliate(cj: CjProductSummary, extra?: { categorySlug?: string | null; subcategorySlug?: string | null }) {
  const cost = Number(cj.sellPrice ?? 0)
  const sale = cost ? Math.round(cost * MARKET_MARGIN * 100) / 100 : null
  const original = cost ? Math.round(cost * MARKET_COMPARE * 100) / 100 : null
  return {
    program_key: "cjdropshipping",
    product_name: (cj.productNameEn || `CJ Product ${cj.pid}`).slice(0, 200),
    product_description: [cj.categoryFirstName, cj.categorySecondName].filter(Boolean).join(" / ") || null,
    product_image_url: cj.productImage || null,
    affiliate_link: `https://cjdropshipping.com/`,
    original_price: original,
    sale_price: sale,
    is_active: true,
    is_featured: false,
    category_slug: extra?.categorySlug || null,
    subcategory_slug: extra?.subcategorySlug || null,
    cj_pid: cj.pid,
  }
}
