import { NextRequest, NextResponse } from "next/server"
import { requireAdminRole } from "@/lib/admin-auth"
import { createClient } from "@/lib/supabase/server"
import { cjListProducts, cjStatus, mapCjToAffiliate, resolveCjApiKey } from "@/lib/cj"

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response
  const supabase = await createClient()
  const url = new URL(request.url)
  const section = url.searchParams.get("section") || "overview"
  try {
    if (section === "products") {
      const { data, error } = await supabase
        .from("affiliate_products")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200)
      if (error) throw error
      return NextResponse.json({ products: data || [] })
    }
    if (section === "categories") {
      const { data, error } = await supabase
        .from("marketplace_categories")
        .select("*")
        .order("sort", { ascending: true })
      if (error) {
        // table not migrated yet — fall back to code tree
        const { MARKET_DEPARTMENTS } = await import("@/lib/marketplace-categories")
        return NextResponse.json({ categories: [], tree: MARKET_DEPARTMENTS, migrated: false })
      }
      const { MARKET_DEPARTMENTS } = await import("@/lib/marketplace-categories")
      return NextResponse.json({ categories: data || [], tree: MARKET_DEPARTMENTS, migrated: true })
    }
    if (section === "cj-status") {
      const status = await cjStatus()
      return NextResponse.json({ status })
    }
    if (section === "pay-status") {
      const { data } = await supabase.from("site_settings").select("key").in("key", ["paystack_secret_key", "paystack_public_key"])
      const keys = new Set(((data || []) as Array<{ key: string }>).map((r) => r.key))
      return NextResponse.json({ status: { secret: keys.has("paystack_secret_key"), public: keys.has("paystack_public_key") } })
    }
    if (section === "orders") {
      const { data, error } = await supabase
        .from("marketplace_orders")
        .select("id,email,items,subtotal_usd,shipping_usd,total_usd,total_ngn,paystack_reference,paystack_status,cj_order_id,cj_status,status,ship_name,ship_phone,ship_city,ship_country,ship_method,ship_eta,created_at")
        .order("created_at", { ascending: false })
        .limit(200)
      if (error) throw error
      return NextResponse.json({ orders: data || [] })
    }
    if (section === "banners") {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "marketplace_banners").maybeSingle()
      const { parseBanners } = await import("@/lib/marketplace-banners")
      return NextResponse.json({ banners: parseBanners((data as { value?: unknown } | null)?.value) })
    }
    if (section === "cj-list") {      const key = await resolveCjApiKey()
      if (!key) return NextResponse.json({ demo: true, list: [], message: "CJ API key not set" })
      const list = await cjListProducts({
        pageNum: Number(url.searchParams.get("page") || "1"),
        pageSize: Number(url.searchParams.get("size") || "20"),
        productNameEn: url.searchParams.get("q") || undefined,
      })
      return NextResponse.json({ demo: false, ...list })
    }
    // overview
    const { data: products } = await supabase.from("affiliate_products").select("id,is_active,is_featured,clicks,conversions,sale_price,program_key,created_at").limit(500)
    const list = (products || []) as Array<{ id: string; is_active: boolean; is_featured: boolean; clicks: number | null; conversions: number | null; sale_price: number | null; program_key: string | null; created_at: string | null }>
    const total = list.length
    const active = list.filter((p) => p.is_active).length
    const featured = list.filter((p) => p.is_featured).length
    const clicks = list.reduce((s, p) => s + (p.clicks || 0), 0)
    const conversions = list.reduce((s, p) => s + (p.conversions || 0), 0)
    const vendors = new Set(list.map((p) => p.program_key).filter(Boolean)).size
    const { data: pages } = await supabase.from("site_pages").select("slug,is_published").eq("slug", "marketplace").maybeSingle()
    return NextResponse.json({
      overview: { total, active, featured, clicks, conversions, vendors, pagePublished: (pages as { is_published?: boolean } | null)?.is_published ?? true },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load marketplace"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response
  const supabase = await createClient()
  try {
    const body = await request.json()
    // Save CJ API key to site_settings
    if (body.action === "cj-save-key") {
      const key = String(body.apiKey || "").trim()
      if (!key) return NextResponse.json({ error: "API key required" }, { status: 400 })
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "cj_api_key", value: key as unknown as never }, { onConflict: "key" })
      if (error) throw error
      const status = await cjStatus()
      return NextResponse.json({ success: true, status })
    }
    // Save Paystack keys to site_settings
    if (body.action === "pay-save-keys") {
      const secret = String(body.secret || "").trim()
      const pub = String(body.public || "").trim()
      if (secret && !secret.startsWith("sk_")) return NextResponse.json({ error: "Secret key should start with sk_." }, { status: 400 })
      if (pub && !pub.startsWith("pk_")) return NextResponse.json({ error: "Public key should start with pk_." }, { status: 400 })
      const rows = []
      if (secret) rows.push({ key: "paystack_secret_key", value: secret as unknown as never })
      if (pub) rows.push({ key: "paystack_public_key", value: pub as unknown as never })
      if (rows.length === 0) return NextResponse.json({ error: "Paste at least one key." }, { status: 400 })
      const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" })
      if (error) throw error
      return NextResponse.json({ success: true })
    }
    // Update order status (fulfillment pipeline)
    if (body.action === "order-status") {
      const id = String(body.id || "")
      const status = String(body.status || "")
      if (!id || !["pending", "paid", "fulfilled", "delivered", "cancelled"].includes(status)) {
        return NextResponse.json({ error: "Valid id and status required." }, { status: 400 })
      }
      const { data, error } = await supabase.from("marketplace_orders").update({ status }).eq("id", id).select("id,status").single()
      if (error) throw error
      return NextResponse.json({ order: data })
    }
    // Save storefront banners (hero / promo / category default / per-department)
    if (body.action === "banners-save") {
      const { parseBanners } = await import("@/lib/marketplace-banners")
      const banners = parseBanners(body.banners)
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "marketplace_banners", value: banners as unknown as never }, { onConflict: "key" })
      if (error) throw error
      return NextResponse.json({ success: true, banners })
    }
    if (body.action === "cj-import") {
      const items = Array.isArray(body.items) ? body.items : []
      if (items.length === 0) return NextResponse.json({ error: "No items to import" }, { status: 400 })
      if (items.length > 50) return NextResponse.json({ error: "Max 50 per batch" }, { status: 400 })
      const rows = items.map((cj: { pid: string; productNameEn?: string; productImage?: string; sellPrice?: number; categoryFirstName?: string; categorySecondName?: string }) =>
        mapCjToAffiliate(cj, { categorySlug: body.categorySlug || null, subcategorySlug: body.subcategorySlug || null })
      )
      // skip already-imported pids
      const pids = rows.map((r: { cj_pid: string }) => r.cj_pid)
      const { data: existing } = await supabase.from("affiliate_products").select("cj_pid").in("cj_pid", pids)
      const seen = new Set((existing || []).map((e: { cj_pid: string }) => e.cj_pid))
      const fresh = rows.filter((r: { cj_pid: string }) => !seen.has(r.cj_pid))
      if (fresh.length === 0) return NextResponse.json({ imported: 0, skipped: rows.length })
      const { data, error } = await supabase.from("affiliate_products").insert(fresh).select("id")
      if (error) throw error
      return NextResponse.json({ imported: data?.length ?? 0, skipped: rows.length - fresh.length })
    }
    const { data, error } = await supabase
      .from("affiliate_products")
      .insert({
        program_key: body.program_key || null,
        product_name: String(body.product_name || "").slice(0, 200),
        product_description: body.product_description || null,
        product_image_url: body.product_image_url || null,
        affiliate_link: body.affiliate_link || "",
        original_price: body.original_price ?? null,
        sale_price: body.sale_price ?? null,
        is_active: body.is_active ?? true,
        is_featured: body.is_featured ?? false,
        category_slug: body.category_slug ?? null,
        subcategory_slug: body.subcategory_slug ?? null,
        cj_pid: body.cj_pid ?? null,
        cj_vid: body.cj_vid ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ product: data })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create product"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response
  const supabase = await createClient()
  try {
    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const allowed: Record<string, unknown> = {}
    for (const k of ["program_key", "product_name", "product_description", "product_image_url", "affiliate_link", "original_price", "sale_price", "is_active", "is_featured", "clicks", "conversions", "category_slug", "subcategory_slug", "cj_pid", "cj_vid", "stock"]) {
      if (k in updates) allowed[k] = updates[k]
    }
    const { data, error } = await supabase.from("affiliate_products").update(allowed).eq("id", id).select().single()
    if (error) throw error
    return NextResponse.json({ product: data })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to update product"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response
  const supabase = await createClient()
  try {
    const body = await request.json()
    if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const { error } = await supabase.from("affiliate_products").delete().eq("id", body.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to delete product"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  // Activate / publish the marketplace site page (Pages module wiring)
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response
  const supabase = await createClient()
  try {
    const body = await request.json()
    const is_published = body?.is_published !== false
    const { error } = await supabase.from("site_pages").upsert(
      {
        slug: "marketplace",
        title: "TechPivo Marketplace",
        subtitle: "Discover curated tech products, tools and services — reviewed and recommended by the Techpivo team.",
        is_published,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    )
    if (error) throw error
    return NextResponse.json({ success: true, is_published })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to update page"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
