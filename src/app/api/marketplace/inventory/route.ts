import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdmin } from "@/lib/supabase/admin"
import { checkRateLimit, clientIp } from "@/lib/rate-limiter"

export const dynamic = "force-dynamic"

// GET /api/marketplace/inventory — list TechPivo-owned inventory products
// Query: ?category_slug=&is_active=true&low_stock=true&search=
export async function GET(request: NextRequest) {
  const limit = checkRateLimit(`mkt_inventory_get_${clientIp(request)}`, { limit: 120, windowMs: 60 * 1000 })
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }
  const supabase = createAdmin()
  const url = new URL(request.url)
  const category = url.searchParams.get("category_slug") || undefined
  const isActive = url.searchParams.get("is_active")
  const lowStock = url.searchParams.get("low_stock") === "true"
  const search = url.searchParams.get("search") || undefined
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1)
  const size = Math.min(200, Math.max(1, Number(url.searchParams.get("size")) || 50))
  const from = (page - 1) * size

  let q = supabase
    .from("marketplace_products")
    .select("id,name,description,short_description,sku,category_slug,subcategory_slug,fulilment_type,seller_id,cost_usd,shipping_cost_usd,sale_price_usd,compare_at_price_usd,stock_quantity,low_stock_threshold,weight_grams,length_cm,width_cm,height_cm,main_image_url,gallery_images,video_url,is_active,is_featured,is_digital,shipping_restrictions,cj_pid,cj_vid,created_at,updated_at", { count: "exact" })
    .eq("fulilment_type", "inventory")
  if (category) q = q.eq("category_slug", category)
  if (isActive !== undefined) q = q.eq("is_active", isActive === "true")
  // low_stock: stock <= low_stock_threshold
  if (lowStock) q = q.lte("stock_quantity", 0).or("stock_quantity.lte.5")
  if (search) q = q.ilike("name", `%${search}%`)
  q = q.order("created_at", { ascending: false }).range(from, from + size - 1)
  const { data, error, count } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    products: data || [],
    total: count ?? 0,
    page,
    size,
    low_stock_count: data?.filter((p: any) => p.stock_quantity <= (p.low_stock_threshold || 5)).length || 0,
  })
}

// POST /api/marketplace/inventory — create or update an inventory product
// Body actions: upsert | delete | restock | adjust
export async function POST(request: NextRequest) {
  const limit = checkRateLimit(`mkt_inventory_post_${clientIp(request)}`, { limit: 60, windowMs: 60 * 1000 })
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }
  const supabase = createAdmin()
  try {
    const body = await request.json()
    const action = String(body.action || "upsert")

    if (action === "upsert") {
      const id = body.id ? String(body.id) : undefined
      const sku = body.sku ? String(body.sku).trim() : null
      const name = String(body.name || "").trim()
      if (!name) return NextResponse.json({ error: "Product name required." }, { status: 400 })
      const categorySlug = body.category_slug ? String(body.category_slug).trim() : null
      const subcategorySlug = body.subcategory_slug ? String(body.subcategory_slug).trim() : null
      const cost = Number(body.cost_usd) || 0
      const shipCost = Number(body.shipping_cost_usd) || 0
      const salePrice = Number(body.sale_price_usd) || 0
      const compareAt = body.compare_at_price_usd != null ? Number(body.compare_at_price_usd) : null
      const stock = Number(body.stock_quantity) || 0
      const lowStock = Number(body.low_stock_threshold) || 5
      const weight = body.weight_grams != null ? Number(body.weight_grams) : null
      const length = body.length_cm != null ? Number(body.length_cm) : null
      const width = body.width_cm != null ? Number(body.width_cm) : null
      const height = body.height_cm != null ? Number(body.height_cm) : null
      const mainImage = body.main_image_url ? String(body.main_image_url) : null
      const gallery = Array.isArray(body.gallery_images) ? body.gallery_images : []
      const video = body.video_url ? String(body.video_url) : null
      const isActive = body.is_active !== false
      const isFeatured = body.is_featured === true
      const isDigital = body.is_digital === true
      const restrictions = body.shipping_restrictions ? String(body.shipping_restrictions) : null

      const patch: Record<string, unknown> = {
        name, category_slug: categorySlug, subcategory_slug: subcategorySlug,
        cost_usd: cost, shipping_cost_usd: shipCost, sale_price_usd: salePrice,
        compare_at_price_usd: compareAt, stock_quantity: stock, low_stock_threshold: lowStock,
        weight_grams: weight, length_cm: length, width_cm: width, height_cm: height,
        main_image_url: mainImage, gallery_images: gallery, video_url: video,
        is_active: isActive, is_featured: isFeatured, is_digital: isDigital,
        shipping_restrictions: restrictions, updated_at: new Date().toISOString(),
      }
      if (sku) patch.sku = sku
      if (id) {
        const { data, error } = await supabase.from("marketplace_products").update(patch).eq("id", id).select().single()
        if (error) throw error
        return NextResponse.json({ success: true, product: data, action: "updated" })
      }
      patch.created_at = new Date().toISOString()
      const { data, error } = await supabase.from("marketplace_products").insert(patch).select().single()
      if (error) throw error
      return NextResponse.json({ success: true, product: data, action: "created" })
    }

    if (action === "delete") {
      const id = String(body.id || "")
      if (!id) return NextResponse.json({ error: "Product id required." }, { status: 400 })
      const { error } = await supabase.from("marketplace_products").delete().eq("id", id)
      if (error) throw error
      return NextResponse.json({ success: true, action: "deleted" })
    }

    if (action === "restock" || action === "adjust") {
      const id = String(body.id || "")
      const delta = Number(body.delta || 0)
      const to = body.to != null ? Number(body.to) : null
      const reason = String(body.reason || "restock")
      if (!id) return NextResponse.json({ error: "Product id required." }, { status: 400 })
      const { data: current } = await supabase.from("marketplace_products").select("id,name,stock_quantity").eq("id", id).maybeSingle()
      if (!current) return NextResponse.json({ error: "Product not found." }, { status: 404 })
      const nextQty = to != null ? Math.max(0, to) : Math.max(0, Number(current.stock_quantity || 0) + delta)
      const { data, error } = await supabase
        .from("marketplace_products")
        .update({ stock_quantity: nextQty, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("id,name,stock_quantity").single()
      if (error) throw error
      // Inventory movement audit trail
      await supabase.from("marketplace_inventory").insert({
        product_id: id,
        change_type: action === "restock" ? "restock" : "adjustment",
        quantity_change: nextQty - Number(current.stock_quantity || 0),
        quantity_after: nextQty,
        reason,
      })
      return NextResponse.json({ success: true, product: data, action })
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Inventory operation failed."
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
