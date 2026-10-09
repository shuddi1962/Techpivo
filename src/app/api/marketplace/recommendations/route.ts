import { NextRequest, NextResponse } from "next/server"
import { createPublicClient } from "@/lib/supabase/server"
import { createClient as createAdmin } from "@/lib/supabase/admin"
import { fetchWithTimeout } from "@/lib/fetch-timeout"
import { supplierDisplayName } from "@/lib/marketplace"
import { marketImage, cleanSupplierText } from "@/lib/marketplace-images"
import { scoreComplementary } from "@/lib/marketplace-recommend"
import type { StoreProduct } from "@/lib/marketplace-catalog"

export const dynamic = "force-dynamic"

const COLS =
  "id,product_name,product_description,product_image_url,original_price,sale_price,program_key,is_featured,stock,clicks,created_at,category_slug,subcategory_slug"

// GET /api/marketplace/recommendations?product_id=<uuid>&limit=4
// Complementary ("Complete Your Purchase") picks for one product:
// admin overrides -> real co-purchase history -> category compatibility.
// Never random: returns fewer than `limit` when nothing relevant exists.
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const productId = url.searchParams.get("product_id") || ""
    const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit")) || 4, 8))
    if (!/^[0-9a-f-]{36}$/i.test(productId)) {
      return NextResponse.json({ error: "A valid product_id is required." }, { status: 400 })
    }
    const supabase = createPublicClient()

    const curRes = (await fetchWithTimeout(
      supabase
        .from("affiliate_products")
        .select("id,category_slug,subcategory_slug")
        .eq("id", productId)
        .eq("is_active", true)
        .maybeSingle(),
      8000
    )) as {
      data: { id: string; category_slug: string | null; subcategory_slug: string | null } | null
    } | null
    const current = curRes?.data
    if (!current) return NextResponse.json({ items: [] })

    // Admin overrides (best-effort — table missing before migration 094).
    let overrides: string[] = []
    try {
      const ovRes = (await fetchWithTimeout(
        supabase
          .from("marketplace_recommendations")
          .select("recommended_id,position")
          .eq("primary_id", productId)
          .eq("is_active", true)
          .order("position", { ascending: true })
          .limit(8),
        8000
      )) as { data: Array<{ recommended_id: string; position: number }> | null } | null
      overrides = (ovRes?.data || []).map((r) => r.recommended_id).filter(Boolean)
    } catch {
      overrides = []
    }

    // Candidate pool: same category/subcategory rows + override targets.
    const orParts: string[] = []
    if (current.category_slug) {
      const s = current.category_slug.replace(/[,()]/g, "")
      orParts.push(`category_slug.eq.${s}`, `subcategory_slug.eq.${s}`)
    }
    const sub = current.subcategory_slug || current.category_slug
    if (sub && sub !== current.category_slug) {
      const s = sub.replace(/[,()]/g, "")
      orParts.push(`category_slug.eq.${s}`, `subcategory_slug.eq.${s}`)
    }
    let poolQuery = supabase
      .from("affiliate_products")
      .select(COLS)
      .eq("is_active", true)
      .neq("id", productId)
      .order("clicks", { ascending: false, nullsFirst: false })
      .limit(30)
    if (orParts.length > 0) poolQuery = poolQuery.or(orParts.join(","))
    const poolRes = (await fetchWithTimeout(poolQuery, 10000)) as {
      data: Array<Record<string, unknown>> | null
    } | null
    let pool = ((poolRes?.data || []) as unknown as Array<StoreProduct & { product_description: string | null }>)

    // Override targets may sit outside the category pool — fetch them too.
    const poolIds = new Set(pool.map((p) => p.id))
    const missing = overrides.filter((id) => !poolIds.has(id)).slice(0, 8)
    if (missing.length > 0) {
      try {
        const extraRes = (await fetchWithTimeout(
          supabase.from("affiliate_products").select(COLS).in("id", missing).eq("is_active", true),
          8000
        )) as { data: Array<StoreProduct & { product_description: string | null }> | null } | null
        pool = [...pool, ...((extraRes?.data || []) as Array<StoreProduct & { product_description: string | null }>)]
      } catch {
        // overrides outside the pool are skipped
      }
    }

    // Co-purchase counts from real paid orders (informational, best-effort).
    const coCounts = new Map<string, number>()
    try {
      const admin = createAdmin()
      const { data: orders } = await admin
        .from("marketplace_orders")
        .select("items")
        .in("status", ["paid", "fulfilled", "delivered"])
        .limit(500)
      const withCurrent = (orders || []).filter((o) => {
        const items = (o as { items?: Array<{ id?: string }> }).items
        return Array.isArray(items) && items.some((it) => it?.id === productId)
      })
      for (const o of withCurrent) {
        const items = (o as { items?: Array<{ id?: string }> }).items || []
        for (const it of items) {
          if (it?.id && it.id !== productId) coCounts.set(it.id, (coCounts.get(it.id) || 0) + 1)
        }
      }
    } catch {
      // order history unavailable — category logic still applies
    }

    const sanitized: StoreProduct[] = pool.map((p) => ({
      id: p.id,
      product_name: cleanSupplierText(p.product_name) || p.product_name,
      product_description: null,
      product_image_url: marketImage(p.product_image_url),
      original_price: p.original_price,
      sale_price: p.sale_price,
      program_key: supplierDisplayName(p.program_key),
      is_featured: !!p.is_featured,
      stock: p.stock,
      clicks: p.clicks,
      created_at: p.created_at,
      category_slug: p.category_slug,
      subcategory_slug: p.subcategory_slug,
      rating: 0,
      reviews: 0,
    }))

    const scored = scoreComplementary(current, sanitized, { overrides, coCounts, limit })
    return NextResponse.json({
      items: scored.map((s) => ({
        ...s.product,
        recommend_reason: s.reason,
        bought_together: coCounts.get(s.product.id) || 0,
      })),
    })
  } catch {
    // Recommendations must never break the product page.
    return NextResponse.json({ items: [] })
  }
}
