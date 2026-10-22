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
  /** True when the product is already in "My Products" on CJ. */
  myProduct?: boolean
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
  myProduct?: boolean
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
    myProduct: p.myProduct === true,
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
  /** CJ third-level category ids. */
  lv3categoryList?: string[]
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
  if (opts.lv3categoryList && opts.lv3categoryList.length > 0) {
    params.set("lv3categoryList", opts.lv3categoryList.join(","))
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
  lv3categoryList?: string[]
  /**
   * CJ category names (first/second/leaf) the result must belong to.
   * Used as a hard local filter so a search inside one department can
   * never return a product from another department.
   */
  categoryNames?: string[]
}): Promise<CjListV2Result> {
  const orderBy =
    opts.sort === "listings" ? 1 : opts.sort === "price_asc" || opts.sort === "price_desc" ? 2 : opts.sort === "new" ? 3 : 0
  const sort = opts.sort === "price_asc" ? "asc" : "desc"
  const productFlag = opts.flag === "trending" ? 0 : opts.flag === "new" ? 1 : undefined
  const names = (opts.categoryNames || []).map((n) => n.trim().toLowerCase()).filter(Boolean)
  // ALL names must be present: a product inside "Consumer Electronics >
  // Camera & Photo" matches a department+subcategory filter, but a product
  // from another department never does.
  const inCategory = (p: CjProductSummary) => {
    if (names.length === 0) return true
    const hay = `${p.categoryFirstName || ""} ${p.categorySecondName || ""} ${p.categoryThirdName || ""}`.toLowerCase()
    return names.every((n) => hay.includes(n))
  }
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
      lv3categoryList: opts.lv3categoryList,
    })
    if (names.length === 0) return res
    const list = res.list.filter(inCategory)
    return { ...res, list, total: list.length }
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
      .filter(inCategory)
    return {
      list,
      total: list.length,
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

/**
 * One supplier product with ALL of its variants.
 *
 * `/product/query?pid=` is the only CJ endpoint that returns the full
 * variant list — `/product/variant/query?pid=` answers with a SINGLE
 * (default) variant, which is why multi-variant products could never be
 * matched to the option the shopper picked.
 */
export interface CjProductDetail {
  pid: string
  sku: string
  name: string
  variants: CjVariant[]
}

export async function cjGetProductDetail(pid: string): Promise<CjProductDetail> {
  const raw = (await cjGetProduct(pid)) as {
    pid?: string
    productSku?: string
    productNameEn?: string
    variants?: CjVariant[]
  } | null
  return {
    pid: String(raw?.pid || pid),
    sku: String(raw?.productSku || ""),
    name: String(raw?.productNameEn || ""),
    variants: Array.isArray(raw?.variants) ? raw.variants : [],
  }
}

export async function cjGetVariants(pid: string): Promise<CjVariant[]> {
  try {
    const product = await cjGetProductDetail(pid)
    if (product.variants.length > 0) return product.variants
  } catch {
    // fall through to the single-variant endpoint
  }
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * CJ throttles variant lookups (HTTP 429) when several fire at once — which
 * is exactly what a multi-item checkout does. Retry with backoff so a busy
 * supplier API degrades to "try again" instead of losing the variant (a
 * missing variant means the order can never be fulfilled).
 */
export async function cjGetVariantsResilient(pid: string): Promise<CjVariant[]> {
  let lastErr: unknown = null
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(700 * attempt)
    try {
      return await cjGetVariants(pid)
    } catch (e) {
      lastErr = e
      const msg = e instanceof Error ? e.message : ""
      // Only rate/throughput errors are worth retrying; auth/config errors
      // would fail identically on every attempt.
      if (!/429|rate|throttl|too many|timeout|network|fetch failed/i.test(msg)) break
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("CJ variant lookup failed")
}

/** The variant we ship by default: cheapest, else the first one. */
export function pickDefaultVariant(variants: CjVariant[]): string | null {
  const usable = (variants || []).filter((v) => v && String(v.vid || "").trim())
  if (usable.length === 0) return null
  const priced = usable
    .map((v) => ({ vid: String(v.vid), price: Number(v.variantSellPrice) || 0 }))
    .sort((a, b) => a.price - b.price)
  return priced[0].vid || null
}

export interface CjCategory {
  categoryFirstId?: string
  categoryFirstName?: string
  categorySecondId?: string
  categorySecondName?: string
  /** Third level (leaf) category id — the one listV2 filters on. */
  categoryId?: string
  categoryName?: string
}

/**
 * The full CJ category tree flattened into one row per leaf category.
 * CJ returns it nested (first → second → third) with the ids we need to
 * filter `product/listV2` by category.
 */
export interface CjCategoryRow {
  firstId: string
  firstName: string
  secondId: string
  secondName: string
  thirdId: string
  thirdName: string
}

export async function cjGetCategoryRows(): Promise<CjCategoryRow[]> {
  const key = await resolveCjApiKey()
  if (!key) throw new Error("CJ API key not configured")
  const token = await getAccessToken(key)
  // NOTE: the endpoint is /product/getCategory (NOT /product/category/...).
  const data = await cjFetch<unknown>(`/api2.0/v1/product/getCategory`, { method: "GET", token })
  const rows: CjCategoryRow[] = []
  const arr = Array.isArray(data) ? data : []
  for (const first of arr as Array<Record<string, unknown>>) {
    const firstId = String(first?.categoryFirstId || "")
    const firstName = String(first?.categoryFirstName || "")
    const firstList = Array.isArray(first?.categoryFirstList) ? (first?.categoryFirstList as Array<Record<string, unknown>>) : []
    for (const second of firstList) {
      const secondId = String(second?.categorySecondId || "")
      const secondName = String(second?.categorySecondName || "")
      const secondList = Array.isArray(second?.categorySecondList) ? (second?.categorySecondList as Array<Record<string, unknown>>) : []
      for (const third of secondList) {
        const thirdId = String(third?.categoryId || "")
        const thirdName = String(third?.categoryName || "")
        if (!thirdId) continue
        rows.push({ firstId, firstName, secondId, secondName, thirdId, thirdName })
      }
    }
  }
  return rows
}

/** Flat list of categories (kept for backwards compatibility). */
export async function cjGetCategories(): Promise<CjCategory[]> {
  const rows = await cjGetCategoryRows()
  return rows.map((r) => ({
    categoryFirstId: r.firstId,
    categoryFirstName: r.firstName,
    categorySecondId: r.secondId,
    categorySecondName: r.secondName,
    categoryId: r.thirdId,
    categoryName: r.thirdName,
  }))
}

/**
 * Name → category ids index, used to map our own store categories onto CJ
 * categories so a search inside a department can never return a product
 * from another department.
 */
let categoryIndexCache: { at: number; index: CjCategoryIndex } | null = null
const CATEGORY_INDEX_TTL = 60 * 60 * 1000 // 1h

export interface CjCategoryIndex {
  rows: CjCategoryRow[]
  /** lower-cased first-level name → rows */
  byFirst: Map<string, CjCategoryRow[]>
  /** lower-cased second-level name → rows */
  bySecond: Map<string, CjCategoryRow[]>
  /** lower-cased leaf name → rows */
  byThird: Map<string, CjCategoryRow[]>
}

function norm(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

/**
 * Fold a name to a comparable form: lower case, punctuation removed and a
 * trailing "s" dropped from every word ("Laptops & Tablets" and CJ's
 * "Laptop & Tablets" must map to the same category).
 */
function fold(s: string) {
  return norm(s)
    .split(" ")
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w))
    .join(" ")
}

export async function cjGetCategoryIndex(): Promise<CjCategoryIndex> {
  const now = Date.now()
  if (categoryIndexCache && now - categoryIndexCache.at < CATEGORY_INDEX_TTL) return categoryIndexCache.index
  const rows = await cjGetCategoryRows()
  const byFirst = new Map<string, CjCategoryRow[]>()
  const bySecond = new Map<string, CjCategoryRow[]>()
  const byThird = new Map<string, CjCategoryRow[]>()
  const push = (m: Map<string, CjCategoryRow[]>, k: string, r: CjCategoryRow) => {
    const key = norm(k)
    if (!key) return
    const list = m.get(key) || []
    list.push(r)
    m.set(key, list)
  }
  for (const r of rows) {
    push(byFirst, r.firstName, r)
    push(bySecond, r.secondName, r)
    push(byThird, r.thirdName, r)
  }
  const index = { rows, byFirst, bySecond, byThird }
  categoryIndexCache = { at: now, index }
  return index
}

/**
 * Find the CJ first-level category that matches one of OUR department
 * names. Our taxonomy was modelled on CJ's, so the names are nearly
 * identical — but CJ calls it "Laptop & Tablets" where we say "Laptops &
 * Tablets", hence the folded comparison.
 */
export function matchCjFirstLevel(index: CjCategoryIndex, ourName: string): CjCategoryRow[] {
  const target = fold(ourName)
  if (!target) return []
  const exact = index.byFirst.get(norm(ourName))
  if (exact && exact.length) return exact
  const rows = index.rows.filter((r) => fold(r.firstName) === target)
  return rows
}

/**
 * Find the CJ second-level categories (inside a department) that match one
 * of OUR subcategory names.
 */
export function matchCjSecondLevel(index: CjCategoryIndex, ourName: string, firstName?: string): CjCategoryRow[] {
  const target = fold(ourName)
  if (!target) return []
  const inDept = (r: CjCategoryRow) => !firstName || fold(r.firstName) === fold(firstName)
  const rows = index.rows.filter((r) => inDept(r) && fold(r.secondName) === target)
  if (rows.length) return rows
  return index.rows.filter((r) => inDept(r) && norm(r.secondName) === norm(ourName))
}

/**
 * Add a CJ catalog product to "My Products" so it shows up in the CJ
 * platform as one of YOUR store products (and can be listed/ordered from
 * there). Idempotent — CJ answers 1600000 when it is already added.
 */
export async function cjAddToMyProduct(pid: string): Promise<{ ok: boolean; already: boolean; message: string }> {
  const key = await resolveCjApiKey()
  if (!key) throw new Error("CJ API key not configured")
  const token = await getAccessToken(key)
  const res = await fetch(`${CJ_BASE}/api2.0/v1/product/addToMyProduct`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "CJ-Access-Token": token },
    body: JSON.stringify({ productId: pid }),
    signal: AbortSignal.timeout(20000),
  })
  const json = (await res.json().catch(() => ({}))) as { code?: number; result?: boolean; message?: string }
  if (json?.code === 200) return { ok: true, already: false, message: json.message || "Added to My Products" }
  // 1600000 / 100002 — "the product has been added to My Products".
  if (json?.code === 1600000 || json?.code === 100002) {
    return { ok: true, already: true, message: json.message || "Already in My Products" }
  }
  return { ok: false, already: false, message: json?.message || `CJ error ${json?.code ?? "?"}` }
}

/** Your own products on CJ ("My Products"). */
export async function cjGetMyProducts(opts?: { keyword?: string; page?: number; size?: number }): Promise<{
  total: number
  rows: Array<{ productId: string; nameEn: string; sku: string; bigImage: string; sellPrice: number; myProduct: boolean }>
}> {
  const key = await resolveCjApiKey()
  if (!key) throw new Error("CJ API key not configured")
  const token = await getAccessToken(key)
  const params = new URLSearchParams({
    page: String(Math.min(Math.max(opts?.page ?? 1, 1), 100)),
    size: String(Math.min(Math.max(opts?.size ?? 20, 1), 100)),
  })
  if (opts?.keyword) params.set("keyword", opts.keyword.slice(0, 200))
  const data = await cjFetch<{
    totalRecords?: number
    content?: Array<{
      productId?: string
      nameEn?: string
      sku?: string
      bigImage?: string
      sellPrice?: string | number
    }>
  }>(`/api2.0/v1/product/myProduct/query?${params.toString()}`, { method: "GET", token })
  const rows = (data?.content || []).map((p) => ({
    productId: String(p.productId || ""),
    nameEn: p.nameEn || "",
    sku: p.sku || "",
    bigImage: p.bigImage || "",
    sellPrice: parseCjPrice(p.sellPrice),
    myProduct: true,
  }))
  return { total: Number(data?.totalRecords) || rows.length, rows }
}

/** Orders placed on CJ (so the admin can see what the supplier platform has). */
export async function cjListOrders(opts?: { page?: number; size?: number }): Promise<{
  total: number
  rows: Array<{ orderId: string; cjOrderId: string; orderNum: string; status: string; createdAt: string; country: string }>
}> {
  const key = await resolveCjApiKey()
  if (!key) throw new Error("CJ API key not configured")
  const token = await getAccessToken(key)
  const params = new URLSearchParams({
    pageNum: String(Math.min(Math.max(opts?.page ?? 1, 1), 100)),
    pageSize: String(Math.min(Math.max(opts?.size ?? 20, 1), 100)),
  })
  const data = await cjFetch<{
    total?: number
    list?: Array<{
      orderId?: string | number
      cjOrderId?: string
      orderNum?: string
      orderStatus?: string
      /** CJ returns the creation time as `createDate` ("2026-10-07 07:16:34"). */
      createDate?: string
      createdAt?: string | number
      shippingCountryCode?: string
      logisticName?: string | null
    }>
  }>(`/api2.0/v1/shopping/order/list?${params.toString()}`, { method: "GET", token })
  const rows = (data?.list || []).map((o) => ({
    orderId: String(o.orderId || ""),
    cjOrderId: o.cjOrderId || "",
    orderNum: o.orderNum || "",
    status: o.orderStatus || "",
    createdAt: o.createDate || (o.createdAt ? String(o.createdAt) : ""),
    country: o.shippingCountryCode || "",
  }))
  return { total: Number(data?.total) || rows.length, rows }
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
  email?: string
}

/** Normalised CJ order response — every id we might need to track it. */
export interface CjOrderResult {
  /** CJ's own order id (numeric) — use this for getOrderDetail. */
  orderId: string
  /** The CJ-facing reference (SD…) — this is what the CJ UI shows. */
  cjOrderId: string
  /** Our own order number echoed back. */
  orderNumber: string
  status: string
  /** Raw response, kept for debugging. */
  raw: unknown
}

function normalizeCjOrder(data: unknown): CjOrderResult {
  if (typeof data === "string") {
    // Some CJ responses return the id as a bare string.
    const s = data.trim()
    return { orderId: s, cjOrderId: s, orderNumber: "", status: "", raw: data }
  }
  const o = (data || {}) as Record<string, unknown>
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = o[k]
      if (typeof v === "string" && v.trim()) return v.trim()
      if (typeof v === "number" && Number.isFinite(v)) return String(v)
    }
    return ""
  }
  const orderId = pick("orderId", "id")
  const cjOrderId = pick("cjOrderId", "shipmentOrderId")
  const orderNumber = pick("orderNumber", "orderNum")
  return {
    orderId: orderId || cjOrderId || orderNumber,
    cjOrderId: cjOrderId || orderId,
    orderNumber,
    status: pick("orderStatus", "status"),
    raw: data,
  }
}

/**
 * Place the supplier order.
 *
 * Uses `createOrderV2` with `payType: 3` (create the order only — no CJ
 * balance is spent, so the order always shows up in the CJ platform and can
 * be paid/confirmed there). Falls back to the v1 endpoint when v2 rejects
 * the payload.
 */
export async function cjCreateOrder(order: CjOrderInput): Promise<CjOrderResult> {
  const key = await resolveCjApiKey()
  if (!key) throw new Error("CJ API key not configured")
  const token = await getAccessToken(key)
  const body = { ...order, payType: 3, orderFlow: 1, shopLogisticsType: 2 }
  try {
    const data = await cjFetch<unknown>(`/api2.0/v1/shopping/order/createOrderV2`, {
      method: "POST",
      token,
      body: JSON.stringify(body),
    })
    const res = normalizeCjOrder(data)
    if (!res.orderId) {
      // CJ answered 200 but gave us no id. We must NOT retry on the legacy
      // endpoint here: the order may already exist on CJ's side and a second
      // call would place a duplicate real supplier order for one payment.
      const keys = data && typeof data === "object" ? Object.keys(data as object).join(",") : typeof data
      throw new Error(`CJ accepted the request but returned no order id (fields: ${keys}).`)
    }
    return res
  } catch (e) {
    // Only a genuine request failure (network error, rejected payload, HTTP
    // error) reaches this point — CJ never created an order, so retrying on
    // the legacy endpoint is safe.
    const v2Error = e instanceof Error ? e.message : String(e)
    let data: unknown = null
    try {
      data = await cjFetch<unknown>(`/api2.0/v1/shopping/order/createOrder`, {
        method: "POST",
        token,
        body: JSON.stringify(order),
      })
    } catch (v1Error) {
      const v1Msg = v1Error instanceof Error ? v1Error.message : String(v1Error)
      throw new Error(`CJ order create failed (v2: ${v2Error} · v1: ${v1Msg})`)
    }
    const res = normalizeCjOrder(data)
    if (!res.orderId) {
      const keys = data && typeof data === "object" ? Object.keys(data as object).join(",") : typeof data
      throw new Error(`CJ accepted the request but returned no order id (fields: ${keys}).`)
    }
    return res
  }
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

/**
 * The order as CJ sees it — fetched by EITHER the CJ order id or our own
 * custom order number (CJ accepts both). Used right after an order is
 * created to learn the CJ-facing reference (SD…) that the CJ dashboard
 * shows, plus the live tracking status.
 */
export interface CjOrderSnapshot {
  orderId: string
  cjOrderId: string
  orderNum: string
  status: string
  logisticName: string
  trackNumber: string
  trackingProvider: string
  trackingUrl: string
  country: string
  createdAt: string
  raw: unknown
}

export async function cjFetchOrderSnapshot(idOrNumber: string): Promise<CjOrderSnapshot | null> {
  const key = await resolveCjApiKey()
  if (!key) throw new Error("CJ API key not configured")
  const token = await getAccessToken(key)
  const data = await cjFetch<Record<string, unknown>>(
    `/api2.0/v1/shopping/order/getOrderDetail?orderId=${encodeURIComponent(idOrNumber)}`,
    { method: "GET", token }
  )
  const d = (data || {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "")
  return {
    orderId: str(d.orderId),
    cjOrderId: str(d.cjOrderId),
    orderNum: str(d.orderNum),
    status: str(d.orderStatus),
    logisticName: str(d.logisticName),
    trackNumber: str(d.trackNumber),
    trackingProvider: str(d.trackingProvider),
    trackingUrl: str(d.trackingUrl),
    country: str(d.shippingCountryCode),
    createdAt: str(d.createDate),
    raw: data,
  }
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
  extra?: { categorySlug?: string | null; subcategorySlug?: string | null; cjVid?: string | null; cjSku?: string | null }
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
    // The supplier SKU — the second (safer) duplicate key: the same CJ
    // product can be reached through different product ids.
    cj_sku: (extra?.cjSku || cj.sku || "").slice(0, 120) || null,
  }
}
