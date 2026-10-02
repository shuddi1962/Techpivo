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

export function mapCjToAffiliate(cj: CjProductSummary, extra?: { categorySlug?: string | null; subcategorySlug?: string | null }) {
  const price = Number(cj.sellPrice ?? 0)
  return {
    program_key: "cjdropshipping",
    product_name: (cj.productNameEn || `CJ Product ${cj.pid}`).slice(0, 200),
    product_description: [cj.categoryFirstName, cj.categorySecondName].filter(Boolean).join(" / ") || null,
    product_image_url: cj.productImage || null,
    affiliate_link: `https://cjdropshipping.com/`,
    original_price: price ? Math.round(price * 1.25 * 100) / 100 : null,
    sale_price: price || null,
    is_active: true,
    is_featured: false,
    category_slug: extra?.categorySlug || null,
    subcategory_slug: extra?.subcategorySlug || null,
    cj_pid: cj.pid,
  }
}
