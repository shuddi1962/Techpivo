// CJDropshipping API client (server-side only — never import in client components)
// Docs: https://developers.cjdropshipping.com (API v2)
// Auth: POST /api2.0/v1/authentication/getAccessToken { apiKey } -> accessToken (15 days)
// Products: GET /api2.0/v1/product/list, /product/query, /product/variant/query
// Orders: POST /api2.0/v1/shopping/order/createOrder
// Key resolution: CJ_API_KEY env -> site_secrets.cj_api_key -> error (demo mode)

import { getSecret } from "@/lib/site-secrets"

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
  return getSecret("cj_api_key")
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
  /** CJ SKU / SPU (search + debug). */
  sku?: string
  /** How many storefronts list this product (a trending signal). */
  listedNum?: number
  /** Supplier stock in the warehouse. */
  inventory?: number
  /** Third-level CJ category (shown as the leaf). */
  categoryThirdName?: string
  /** CJ category ids (used to filter by category). */
  categoryFirstId?: string
  categorySecondId?: string
  categoryThirdId?: string
}

/**
 * CJ prices arrive as a number on the legacy endpoint and as a STRING on
 * the V2 endpoint — sometimes a RANGE ("11.85-20.00"). `Number("11.85-20")`
 * is NaN, which is exactly how "$NaN" ended up on imported products.
 * Parse defensively and always return a finite number.
 */
export function parseCjPrice(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value !== "string") return 0
  const first = value.match(/-?\d+(?:\.\d+)?/g)
  if (!first || first.length === 0) return 0
  const nums = first.map(Number).filter((n) => Number.isFinite(n))
  if (nums.length === 0) return 0
  // A range means "from X" — the cheapest variant is our cost basis.
  return Math.min(...nums)
}

/** Does this product actually match what the admin searched for? */
export function cjProductMatchesQuery(p: CjProductSummary, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = `${p.productNameEn || ""} ${p.sku || ""} ${p.categoryFirstName || ""} ${p.categorySecondName || ""}`.toLowerCase()
  if (haystack.includes(q)) return true
  const tokens = q.split(/[^a-z0-9]+/i).filter((t) => t.length > 1)
  if (tokens.length === 0) return true
  // Every meaningful token must appear somewhere in the product.
  return tokens.every((t) => haystack.includes(t))
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

/* ------------------------------------------------------------------ *
 * Product List V2 — the supported search endpoint.
 *
 * The legacy /product/list endpoint is DEPRECATED by CJ and does not
 * support keyword search, which is why searching in Admin → CJ Import used
 * to return unrelated products. V2 is elasticsearch-backed and takes
 * `keyWord` (name OR SKU), category filters, sorting and the trending /
 * new product flags.
 * ------------------------------------------------------------------ */
export type CjSort = "match" | "listings" | "price_asc" | "price_desc" | "new"

export interface CjListV2Result {
  list: CjProductSummary[]
  total: number
  page: number
  pages: number
  relatedCategories: Array<{ id: string; name: string }>
  source: "v2" | "v1"
}

interface CjV2Product {
  id?: string
  nameEn?: string
  sku?: string
  spu?: string
  bigImage?: string
  sellPrice?: string | number
  nowPrice?: string | number
  discountPrice?: string | number
  listedNum?: number
  warehouseInventoryNum?: number
  oneCategoryId?: string
  oneCategoryName?: string
  twoCategoryId?: string
  twoCategoryName?: string
  categoryId?: string
  threeCategoryName?: string
}

function normalizeV2Product(p: CjV2Product): CjProductSummary | null {
  const pid = String(p?.id || "").trim()
  if (!pid) return null
  const price =
    parseCjPrice(p.sellPrice) || parseCjPrice(p.nowPrice) || parseCjPrice(p.discountPrice)
  return {
    pid,
    productNameEn: p.nameEn || "",
    productImage: p.bigImage || "",
    sellPrice: price,
    sku: p.sku || p.spu || "",
    listedNum: Number(p.listedNum) || 0,
    inventory: Number(p.warehouseInventoryNum) || 0,
    categoryFirstName: p.oneCategoryName || "",
    categorySecondName: p.twoCategoryName || "",
    categoryThirdName: p.threeCategoryName || "",
    categoryFirstId: p.oneCategoryId || "",
    categorySecondId: p.twoCategoryId || "",
    categoryThirdId: p.categoryId || "",
  }
}

export async function cjListProductsV2(opts: {
  keyWord?: string
  page?: number
  size?: number
  /** CJ third-level category id. */
  categoryId?: string
  /** CJ second-level category ids. */
  lv2categoryList?: string[]
  /** 0 = trending, 1 = new, 2 = video, 3 = slow-moving. */
  productFlag?: number
  /** 0 = best match, 1 = listing count, 2 = price, 3 = newest. */
  orderBy?: number
  sort?: "asc" | "desc"
  countryCode?: string
}): Promise<CjListV2Result> {
  const key = await resolveCjApiKey()
  if (!key) throw new Error("CJ API key not configured")
  const token = await getAccessToken(key)
  const params = new URLSearchParams({
    page: String(Math.min(Math.max(opts.page ?? 1, 1), 1000)),
    size: String(Math.min(Math.max(opts.size ?? 20, 1), 100)),
  })
  if (opts.keyWord) params.set("keyWord", opts.keyWord.slice(0, 200))
  if (opts.categoryId) params.set("categoryId", opts.categoryId)
  if (opts.lv2categoryList && opts.lv2categoryList.length > 0) {
    params.set("lv2categoryList", opts.lv2categoryList.join(","))
  }
  if (typeof opts.productFlag === "number") params.set("productFlag", String(opts.productFlag))
  if (typeof opts.orderBy === "number") params.set("orderBy", String(opts.orderBy))
  if (opts.sort) params.set("sort", opts.sort)
  if (opts.countryCode) params.set("countryCode", opts.countryCode)
  params.set("features", "enable_category")

  const data = await cjFetch<{
    content?: Array<{
      productList?: CjV2Product[]
      relatedCategoryList?: Array<{ categoryId?: string; categoryName?: string }>
    }>
    totalRecords?: number
    totalPages?: number
    pageNumber?: number
    pageSize?: number
  }>(`/api2.0/v1/product/listV2?${params.toString()}`, { method: "GET", token })

  const content = data?.content || []
  const list: CjProductSummary[] = []
  const relatedCategories: Array<{ id: string; name: string }> = []
  for (const block of content) {
    for (const raw of block.productList || []) {
      const p = normalizeV2Product(raw)
      if (p) list.push(p)
    }
    for (const c of block.relatedCategoryList || []) {
      if (c?.categoryId) relatedCategories.push({ id: c.categoryId, name: c.categoryName || "" })
    }
  }
  return {
    list,
    total: Number(data?.totalRecords) || list.length,
    page: Number(data?.pageNumber) || opts.page || 1,
    pages: Number(data?.totalPages) || 1,
    relatedCategories,
    source: "v2",
  }
}

/** Search the supplier catalog (V2 first, legacy endpoint as a fallback). */
export async function cjSearchProducts(opts: {
  keyWord?: string
  page?: number
  size?: number
  sort?: CjSort
  flag?: "trending" | "new"
  categoryId?: string
  lv2categoryList?: string[]
}): Promise<CjListV2Result> {
  const orderBy =
    opts.sort === "listings" ? 1 : opts.sort === "price_asc" || opts.sort === "price_desc" ? 2 : opts.sort === "new" ? 3 : 0
  const sort = opts.sort === "price_asc" ? "asc" : "desc"
  const productFlag = opts.flag === "trending" ? 0 : opts.flag === "new" ? 1 : undefined
  try {
    const res = await cjListProductsV2({
      keyWord: opts.keyWord,
      page: opts.page,
      size: opts.size,
      orderBy,
      sort,
      productFlag,
      categoryId: opts.categoryId,
      lv2categoryList: opts.lv2categoryList,
    })
    return res
  } catch (e) {
    // Fall back to the deprecated endpoint (still returns usable rows) and
    // filter locally so the admin never sees unrelated products.
    const legacy = await cjListProducts({
      pageNum: opts.page ?? 1,
      pageSize: opts.size ?? 20,
      productNameEn: opts.keyWord,
    })
    const list = (legacy.list || [])
      .map((p) => ({
        ...p,
        sellPrice: parseCjPrice(p.sellPrice),
        productNameEn: p.productNameEn || "",
        productImage: p.productImage || "",
      }))
      .filter((p) => cjProductMatchesQuery(p, opts.keyWord || ""))
    return {
      list,
      total: legacy.total ?? list.length,
      page: opts.page ?? 1,
      pages: 1,
      relatedCategories: [],
      source: "v1",
    }
  }
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
  logisticPrice?: number
  totalPostageFee?: number
  logisticAging?: string
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
  // NOTE: freightCalculate returns data as a RAW ARRAY, not a { list } wrapper.
  const data = await cjFetch<CjFreightOption[] | { list?: CjFreightOption[] }>(
    `/api2.0/v1/logistic/freightCalculate`,
    {
      method: "POST",
      token,
      body: JSON.stringify({
        startCountryCode: opts.startCountryCode ?? "CN",
        endCountryCode: opts.endCountryCode,
        products: opts.products,
      }),
    }
  )
  if (Array.isArray(data)) return data
  return data?.list ?? []
}

// Field names match the CJ v1 createOrder contract exactly
// (docs: developers.cjdropshipping.com shopping API):
// orderNumber + shippingCountryCode + shippingCountry (full name) +
// shippingProvince + shippingCity + shippingAddress + shippingCustomerName +
// shippingPhone + shippingZip + logisticName + fromCountryCode are required;
// the old externalOrderNumber/shippingState shape was rejected by CJ.
export interface CjOrderInput {
  orderNumber: string
  shippingCountryCode: string
  shippingCountry: string
  shippingProvince: string
  shippingCity: string
  shippingAddress: string
  shippingAddress2?: string
  shippingCustomerName: string
  shippingPhone: string
  shippingZip: string
  logisticName: string
  fromCountryCode: string
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

/** Store pricing rule: 20% margin over CJ cost with a $1.50 absolute floor,
 *  so cheap items still clear gateway + FX + handling costs.
 *  sale = max(cost × 1.20, cost + 1.50); compare-at = max(cost × 1.50, sale × 1.25). */
export const MARKET_MARGIN = 1.2
export const MARKET_MIN_MARGIN_USD = 1.5
export const MARKET_COMPARE = 1.5

/** Freight rule: supplier courier rates + 35%. Shipping must earn, not
 *  bleed — CJ lane rates (especially Africa) dwarf flat fees. */
export const FREIGHT_MARKUP = 1.35

export function withMargin(cost: number): number {
  const c = Number(cost)
  return Math.round(Math.max(c * MARKET_MARGIN, c + MARKET_MIN_MARGIN_USD) * 100) / 100
}

export function withFreightMarkup(fee: number): number {
  return Math.round(Number(fee) * FREIGHT_MARKUP * 100) / 100
}

export function mapCjToAffiliate(
  cj: CjProductSummary,
  extra?: { categorySlug?: string | null; subcategorySlug?: string | null; cjVid?: string | null }
) {
  const cost = parseCjPrice(cj.sellPrice)
  const sale = cost > 0 ? withMargin(cost) : null
  const original = cost > 0 && sale ? Math.max(Math.round(cost * MARKET_COMPARE * 100) / 100, Math.round(sale * 1.25 * 100) / 100) : null
  const name = (cj.productNameEn || `CJ Product ${cj.pid}`).slice(0, 200)
  return {
    program_key: "cjdropshipping",
    product_name: name,
    product_description:
      [cj.categoryFirstName, cj.categorySecondName, cj.categoryThirdName].filter(Boolean).join(" / ") ||
      cj.sku ||
      null,
    product_image_url: cj.productImage || null,
    // The real supplier product page (CJ serves /products/{pid}).
    affiliate_link: `https://cjdropshipping.com/products/${encodeURIComponent(cj.pid)}`,
    original_price: original,
    sale_price: sale,
    is_active: true,
    is_featured: false,
    category_slug: extra?.categorySlug || null,
    subcategory_slug: extra?.subcategorySlug || null,
    cj_pid: cj.pid,
    cj_vid: extra?.cjVid || null,
  }
}
