import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdminRole, createServiceClient } from "@/lib/admin-auth"
import { SITE_URL } from "@/lib/constants"
import type { MarketDepartment } from "@/lib/marketplace-categories"
import { cjListProducts, cjProductMatchesQuery, cjSearchProducts, cjStatus, mapCjToAffiliate, resolveCjApiKey } from "@/lib/cj"
import { MARKET_CURRENCIES, type MarketCurrency } from "@/lib/marketplace-pricing"
import { MARKETPLACE_MOBILE_BANNERS_KEY } from "@/lib/marketplace-mobile-banners"

// All database work in this route runs through the service-role client.
// The route is admin-guarded by `requireAdminRole`, and several marketplace
// tables (affiliate_products) only have a public READ policy — a session
// (RLS-bound) client therefore silently updates 0 rows and every write
// failed with "Failed to update product".

// The CJ import/search round-trip is slow (auth + supplier catalogue +

interface SeasonalSalesConfig {
  campaigns: Array<{
    id: string
    status?: string
    analytics?: { impressions?: number; clicks?: number; addToCart?: number }
    [key: string]: unknown
  }>
  [key: string]: unknown
}
// category tree). Without an explicit budget Vercel kills the function at
// the platform default and the browser sees a non-JSON error — which is how
// "Search failed — check the CJ connection." used to appear.
export const maxDuration = 60

// Bust the storefront ISR cache after every admin write, so the next
// refresh renders the new state — never the previous page first.
// Best-effort: the DB write already succeeded even if this throws.
function revalidateStore() {
  try {
    revalidatePath("/marketplace", "layout")
  } catch {
    // ignore — background regen is a bonus, not the write itself
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response
  const supabase = createServiceClient()
  const url = new URL(request.url)
  const section = url.searchParams.get("section") || "overview"
  try {
    if (section === "products") {
      const q = url.searchParams.get("q")?.trim() || ""
      const status = url.searchParams.get("status") || "all"
      const page = Math.max(1, Number(url.searchParams.get("page")) || 1)
      const size = Math.min(200, Math.max(1, Number(url.searchParams.get("size")) || 50))
      const from = (page - 1) * size
      let query = supabase
        .from("affiliate_products")
        .select("id,program_key,product_name,product_description,product_image_url,affiliate_link,original_price,sale_price,clicks,conversions,is_active,is_featured,created_at", { count: "exact" })
      if (q) query = query.or(`product_name.ilike.%${q}%,program_key.ilike.%${q}%`)
      if (status === "active") query = query.eq("is_active", true)
      if (status === "hidden") query = query.eq("is_active", false)
      if (status === "featured") query = query.eq("is_featured", true)
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + size - 1)
      if (error) throw error
      return NextResponse.json({ products: data || [], total: count ?? 0, page, size })
    }
    if (section === "categories") {
      const { fetchMarketplaceCategoryRows, buildMarketplaceTree } = await import("@/lib/marketplace-category-db")
      const rows = await fetchMarketplaceCategoryRows(true)
      const { MARKET_DEPARTMENTS } = await import("@/lib/marketplace-categories")
      const active = rows.filter((r) => r.is_active)
      const tree = buildMarketplaceTree(active)
      // treeAll keeps HIDDEN categories in the admin tree so they can be
      // renamed, re-published or deleted — a hidden row that vanishes from
      // the editor can never be brought back.
      const treeAll = buildMarketplaceTree(rows)
      return NextResponse.json({
        rows,
        tree: tree.length > 0 ? tree : MARKET_DEPARTMENTS,
        treeAll: treeAll.length > 0 ? treeAll : MARKET_DEPARTMENTS,
        dbBacked: rows.length > 0,
        codeTree: MARKET_DEPARTMENTS,
        counts: {
          departments: active.filter((r) => r.depth === 0).length,
          subs: active.filter((r) => r.depth === 1).length,
          leaves: active.filter((r) => r.depth === 2).length,
          hidden: rows.length - active.length,
        },
      })
    }
    if (section === "cj-status") {
      const status = await cjStatus()
      return NextResponse.json({ status })
    }
    if (section === "cj-sync") {
      // What the automatic sync (cron, every 10 minutes) last did.
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "marketplace_cj_sync")
        .maybeSingle()
      const record = (data as { value?: unknown } | null)?.value as
        | { at?: string; orders?: number; variants?: number; pushed?: number; remaining?: number }
        | null
      // How much of the catalogue is still waiting for CJ.
      const [{ count: withoutVariant }, { count: catalogue }] = await Promise.all([
        supabase
          .from("affiliate_products")
          .select("id", { count: "exact", head: true })
          .not("cj_pid", "is", null)
          .is("cj_vid", null),
        supabase
          .from("affiliate_products")
          .select("id", { count: "exact", head: true })
          .not("cj_pid", "is", null),
      ])
      return NextResponse.json({
        lastRun: record?.at || null,
        orders: record?.orders ?? 0,
        variants: record?.variants ?? 0,
        pushed: record?.pushed ?? 0,
        remaining: record?.remaining ?? 0,
        catalogue: catalogue || 0,
        withoutVariant: withoutVariant || 0,
        automatic: true,
      })
    }
    if (section === "pay-status") {
      const { getSecret } = await import("@/lib/site-secrets")
      const [secret, pub, encryption, webhook] = await Promise.all([
        getSecret("flutterwave_secret_key"),
        getSecret("flutterwave_public_key"),
        getSecret("flutterwave_encryption_key"),
        getSecret("flutterwave_secret_hash"),
      ])
      let testMode: boolean | null = null
      if (secret) testMode = secret.includes("_TEST")
      return NextResponse.json({
        status: { secret: !!secret, public: !!pub, encryption: !!encryption, webhook: !!webhook, testMode },
      })
    }
    if (section === "orders") {
      const { data, error } = await supabase
        .from("marketplace_orders")
        .select("id,email,items,subtotal_usd,shipping_usd,total_usd,total_ngn,paystack_reference,paystack_status,cj_order_id,cj_order_ref,cj_status,fulfill_error,status,ship_name,ship_phone,ship_address,ship_city,ship_state,ship_zip,ship_country,ship_method,ship_eta,created_at")
        .order("created_at", { ascending: false })
        .limit(200)
      if (error) throw error
      const orders = (data || []) as Array<Record<string, unknown>>
      // Coupon itemization (graceful until migration 096 is applied live).
      try {
        const ids = orders.map((o) => o.id as string).filter(Boolean)
        if (ids.length > 0) {
          const { data: extra } = await supabase
            .from("marketplace_orders")
            .select("id,coupon_code,discount_usd")
            .in("id", ids)
          const byId = new Map(((extra || []) as Array<{ id: string; coupon_code?: string | null; discount_usd?: number | null }>).map((r) => [r.id, r]))
          for (const o of orders) {
            const hit = byId.get(o.id as string)
            if (hit) {
              o.coupon_code = hit.coupon_code || null
              o.discount_usd = Number(hit.discount_usd) || 0
            }
          }
        }
      } catch {
        // columns not migrated yet — orders still list fine
      }
      return NextResponse.json({ orders })
    }
    // Dashboard analytics — aggregated from real orders + products only.
    // Nothing here is fabricated: empty store = zeros, not sample data.
    if (section === "analytics") {
      const { data: orders } = await supabase
        .from("marketplace_orders")
        .select("id,total_usd,total_ngn,status,paystack_status,items,coupon_code,discount_usd,created_at")
        .order("created_at", { ascending: false })
        .limit(500)
      const PROD_PAGE = 1000
      const prods: Array<{ id: string; product_name: string; product_image_url: string | null; clicks: number | null; conversions: number | null; category_slug: string | null; program_key: string | null; is_active: boolean }> = []
      const { count: prodCount } = await supabase.from("affiliate_products").select("id", { count: "exact", head: true })
      const prodTotal = prodCount ?? 0
      for (let from = 0; from < prodTotal; from += PROD_PAGE) {
        const { data: chunk } = await supabase
          .from("affiliate_products")
          .select("id,product_name,product_image_url,clicks,conversions,category_slug,program_key,is_active")
          .order("clicks", { ascending: false, nullsFirst: false })
          .order("id", { ascending: true })
          .range(from, from + PROD_PAGE - 1)
        const rows = ((chunk || []) as Array<{ id: string; product_name: string; product_image_url: string | null; clicks: number | null; conversions: number | null; category_slug: string | null; program_key: string | null; is_active: boolean }>)
        prods.push(...rows)
        if (rows.length < PROD_PAGE) break
      }
      const list = ((orders || []) as Array<Record<string, unknown>>)
      const paid = list.filter((o) => ["paid", "fulfilled", "delivered"].includes(String(o.status || "")))
      const revenueUsd = paid.reduce((s, o) => s + (Number(o.total_usd) || 0), 0)
      const revenueNgn = paid.reduce((s, o) => s + (Number(o.total_ngn) || 0), 0)
      const couponGiven = list.reduce((s, o) => s + (Number(o.discount_usd) || 0), 0)
      const couponUses = list.filter((o) => o.coupon_code).length
      // 30-day daily series (revenue + orders), oldest → newest.
      const days: Array<{ date: string; label: string; revenue: number; orders: number }> = []
      const byDay = new Map<string, { revenue: number; orders: number }>()
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000)
        const key = d.toISOString().slice(0, 10)
        byDay.set(key, { revenue: 0, orders: 0 })
        days.push({ date: key, label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), revenue: 0, orders: 0 })
      }
      for (const o of paid) {
        const key = String(o.created_at || "").slice(0, 10)
        const hit = byDay.get(key)
        if (hit) {
          hit.revenue = Math.round((hit.revenue + (Number(o.total_usd) || 0)) * 100) / 100
          hit.orders += 1
        }
      }
      for (const d of days) {
        const hit = byDay.get(d.date)
        if (hit) { d.revenue = hit.revenue; d.orders = hit.orders }
      }
      // Status breakdown.
      const statusCount: Record<string, number> = {}
      for (const o of list) {
        const s = String(o.status || "unknown")
        statusCount[s] = (statusCount[s] || 0) + 1
      }
      // Revenue per product from paid order line items. Checkout stores
      // lines as { id, name, unit_usd, qty } — older rows used price /
      // unit_price / total fallbacks, so read every known shape.
      const revById = new Map<string, { qty: number; revenue: number }>()
      for (const o of paid) {
        const items = Array.isArray(o.items) ? (o.items as Array<Record<string, unknown>>) : []
        for (const it of items) {
          const id = String((it as { id?: unknown })?.id || "")
          if (!id) continue
          const qty = Math.max(0, Math.floor(Number((it as { qty?: unknown })?.qty) || 0))
          const unit =
            Number((it as { unit_usd?: unknown })?.unit_usd) ||
            Number((it as { price?: unknown })?.price) ||
            Number((it as { unit_price?: unknown })?.unit_price) ||
            Number((it as { amount?: unknown })?.amount) ||
            0
          const lineTotal =
            Number((it as { total?: unknown })?.total) ||
            Number((it as { line_total?: unknown })?.line_total) ||
            unit * qty
          const hit = revById.get(id) || { qty: 0, revenue: 0 }
          hit.qty += qty
          hit.revenue = Math.round((hit.revenue + lineTotal) * 100) / 100
          revById.set(id, hit)
        }
      }
      const names = new Map(prods.map((p) => [p.id, p.product_name]))
      const topRevenue = [...revById.entries()]
        .map(([id, v]) => ({ id, name: names.get(id) || id.slice(0, 8), ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6)
      const topClicked = prods.slice(0, 6).map((p) => ({ id: p.id, name: p.product_name, clicks: Number(p.clicks) || 0, conversions: Number(p.conversions) || 0 }))
      const totalClicks = prods.reduce((s, p) => s + (Number(p.clicks) || 0), 0)
      const totalConversions = prods.reduce((s, p) => s + (Number(p.conversions) || 0), 0)
      const vendors = new Set(prods.map((p) => p.program_key).filter(Boolean)).size
      // Products per department.
      const catCount: Record<string, number> = {}
      for (const p of prods) {
        const c = p.category_slug || "uncategorized"
        catCount[c] = (catCount[c] || 0) + 1
      }
      const categories = Object.entries(catCount)
        .map(([slug, count]) => ({ slug, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
      // Coupon leaderboard from the coupon store.
      let topCoupons: Array<{ code: string; uses: number; max_uses: number }> = []
      try {
        const { data: cdata } = await supabase.from("site_settings").select("value").eq("key", "marketplace_coupons").maybeSingle()
        const { parseMarketCoupons } = await import("@/lib/marketplace-coupons")
        topCoupons = parseMarketCoupons((cdata as { value?: unknown } | null)?.value)
          .sort((a, b) => b.uses - a.uses)
          .slice(0, 5)
          .map((c) => ({ code: c.code, uses: c.uses, max_uses: c.max_uses }))
      } catch {
        topCoupons = []
      }
      return NextResponse.json({
        analytics: {
          totals: {
            revenueUsd: Math.round(revenueUsd * 100) / 100,
            revenueNgn: Math.round(revenueNgn),
            orders: list.length,
            paid: paid.length,
            avgOrder: paid.length > 0 ? Math.round((revenueUsd / paid.length) * 100) / 100 : 0,
            couponGiven: Math.round(couponGiven * 100) / 100,
            couponUses,
            clicks: totalClicks,
            conversions: totalConversions,
            vendors,
            clickToOrder: totalClicks > 0 ? Math.round((paid.length / totalClicks) * 1000) / 10 : 0,
          },
          series: days,
          statuses: Object.entries(statusCount).map(([status, count]) => ({ status, count })),
          topRevenue,
          topClicked,
          categories,
          topCoupons,
        },
      })
    }
    if (section === "reviews") {      const { data, error } = await supabase
        .from("marketplace_reviews")
        .select("id,product_id,author_name,rating,title,comment,created_at")
        .order("created_at", { ascending: false })
        .limit(300)
      if (error) throw error
      const rows = (data || []) as Array<{ id: string; product_id: string; author_name: string; rating: number; title: string | null; comment: string | null; created_at: string }>
      const ids = [...new Set(rows.map((r) => r.product_id))]
      let names: Record<string, string> = {}
      if (ids.length > 0) {
        const { data: prods } = await supabase.from("affiliate_products").select("id,product_name").in("id", ids)
        names = Object.fromEntries(((prods || []) as Array<{ id: string; product_name: string }>).map((p) => [p.id, p.product_name]))
      }
      return NextResponse.json({ reviews: rows.map((r) => ({ ...r, product_name: names[r.product_id] || "Unknown product" })) })
    }
    if (section === "banners") {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "marketplace_banners").maybeSingle()
      const { parseBanners } = await import("@/lib/marketplace-banners")
      return NextResponse.json({ banners: parseBanners((data as { value?: unknown } | null)?.value) })
    }
    if (section === "mobile-banners") {
      const { data } = await supabase.from("site_settings").select("value").eq("key", MARKETPLACE_MOBILE_BANNERS_KEY).maybeSingle()
      const { parseMobileBanners } = await import("@/lib/marketplace-mobile-banners")
      return NextResponse.json({ banners: parseMobileBanners((data as { value?: unknown } | null)?.value) })
    }
    if (section === "mobile-settings") {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "marketplace_mobile").maybeSingle()
      const { parseMobileSettings } = await import("@/lib/marketplace-mobile")
      return NextResponse.json({ settings: parseMobileSettings((data as { value?: unknown } | null)?.value) })
    }
    if (section === "sales") {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "marketplace_sales").maybeSingle()
      const { parseMarketSales } = await import("@/lib/marketplace-sales")
      return NextResponse.json({ sales: parseMarketSales((data as { value?: unknown } | null)?.value) })
    }
    if (section === "merch") {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "marketplace_merch").maybeSingle()
      const { parseMarketMerch, parseMarketMerchGlobal } = await import("@/lib/marketplace-merch")
      const raw = (data as { value?: unknown } | null)?.value
      return NextResponse.json({ merch: parseMarketMerch(raw), sale_badges: parseMarketMerchGlobal(raw) })
    }
    if (section === "coupons") {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "marketplace_coupons").maybeSingle()
      const { parseMarketCoupons } = await import("@/lib/marketplace-coupons")
      return NextResponse.json({ coupons: parseMarketCoupons((data as { value?: unknown } | null)?.value) })
    }
    // ── Email: list templates ──────────────────────────────────────────────
    if (section === "email-templates") {
      const { data, error } = await supabase
        .from("marketplace_email_templates")
        .select("id,name,event_type,subject,is_active,created_at,updated_at")
        .order("event_type", { ascending: true })
        .order("name", { ascending: true })
      if (error) throw error
      return NextResponse.json({ templates: data || [] })
    }
    // ── Email: list send logs ──────────────────────────────────────────────
    if (section === "email-logs") {
      const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 100))
      const { data, error } = await supabase
        .from("marketplace_email_logs")
        .select("id,template_id,recipient_email,event_type,status,provider_message_id,error,created_at")
        .order("created_at", { ascending: false })
        .limit(limit)
      if (error) throw error
      return NextResponse.json({ logs: data || [] })
    }
    if (section === "popup-stats") {
      const { summarizePopupStats } = await import("@/lib/marketplace-banners")
      const since = new Date(Date.now() - 30 * 86400000).toISOString()
      const { data, error } = await supabase
        .from("marketplace_popup_stats")
        .select("campaign_id,event,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10000)
      if (error) throw error
      return NextResponse.json({ stats: summarizePopupStats((data || []) as Array<{ campaign_id: string; event: "view" | "click" | "close"; created_at: string }>) })
    }
    if (section === "store") {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "marketplace_store").maybeSingle()
      const { sanitizeStore } = await import("@/lib/marketplace-store")
      return NextResponse.json({ store: sanitizeStore((data as { value?: unknown } | null)?.value) })
    }
    // ── CJ import history ────────────────────────────────────────────────
    if (section === "cj-import-history") {
      const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 50))
      const status = url.searchParams.get("status") || undefined
      let q = supabase
        .from("marketplace_cj_import_batches")
        .select("id,imported_by,category_slug,subcategory_slug,requested,imported,skipped,variants_filled,pushed_to_cj,deferred,status,error_message,created_at")
        .order("created_at", { ascending: false })
        .limit(limit)
      if (status) q = q.eq("status", status)
      const { data, error } = await q
      if (error) throw error
      // Fetch items for each batch (only the failed/deferred ones for brevity)
      const batches = (data || []) as Array<{ id: string; created_at: string; [key: string]: unknown }>
      const batchIds = batches.map((b) => b.id)
      let itemsByBatch: Record<string, Array<{ id: string; cj_pid: string; product_name: string; status: string; cj_vid: string | null }>> = {}
      if (batchIds.length > 0) {
        const { data: items } = await supabase
          .from("marketplace_cj_import_items")
          .select("id,batch_id,cj_pid,product_name,status,cj_vid")
          .in("batch_id", batchIds)
          .order("created_at", { ascending: true })
        for (const it of (items || []) as Array<{ id: string; batch_id: string; cj_pid: string; product_name: string; status: string; cj_vid: string | null }>) {
          if (!itemsByBatch[it.batch_id]) itemsByBatch[it.batch_id] = []
          itemsByBatch[it.batch_id].push(it)
        }
      }
      return NextResponse.json({
        batches: batches.map((b) => ({
          ...b,
          items: itemsByBatch[b.id] || [],
          itemCount: (itemsByBatch[b.id] || []).length,
          failedCount: (itemsByBatch[b.id] || []).filter((i) => i.status !== "imported").length,
        })),
      })
    }
    // ── Earnings & profit: daily aggregation by category ───────────────────
    if (section === "earnings") {
      const from = url.searchParams.get("from") || undefined
      const to = url.searchParams.get("to") || undefined
      const category = url.searchParams.get("category") || undefined
      let q = supabase
        .from("marketplace_earnings_daily")
        .select("date,category_slug,gross_revenue_usd,total_discounts_usd,supplier_cost_usd,shipping_charged_usd,shipping_cost_usd,gateway_fees_usd,refunds_usd,platform_commission_usd,seller_earnings_usd,net_profit_usd,orders_count,units_sold")
        .order("date", { ascending: false })
        .limit(300)
      if (from) q = q.gte("date", from)
      if (to) q = q.lte("date", to)
      if (category) q = q.eq("category_slug", category)
      const { data, error } = await q
      if (error) throw error
      return NextResponse.json({ earnings: data || [] })
    }
    // ── Seller commissions ─────────────────────────────────────────────────
    if (section === "seller-commissions") {
      const seller = url.searchParams.get("seller_id") || undefined
      let q = supabase
        .from("marketplace_seller_commissions")
        .select("id,seller_id,category_slug,subcategory_slug,commission_percent,min_commission_usd,created_at,updated_at")
        .order("created_at", { ascending: false })
        .limit(500)
      if (seller) q = q.eq("seller_id", seller)
      const { data, error } = await q
      if (error) throw error
      return NextResponse.json({ commissions: data || [] })
    }
    if (section === "recommendations") {
      // Admin-curated "Complete Your Purchase" overrides (migration 094).
      try {
        const { data, error } = await supabase
          .from("marketplace_recommendations")
          .select("id,primary_id,recommended_id,position,is_active,created_at")
          .order("primary_id", { ascending: true })
          .order("position", { ascending: true })
          .limit(500)
        if (error) throw error
        const rows = (data || []) as Array<{ id: string; primary_id: string; recommended_id: string; position: number; is_active: boolean; created_at: string }>
        const ids = [...new Set(rows.flatMap((r) => [r.primary_id, r.recommended_id]))]
        let names: Record<string, string> = {}
        if (ids.length > 0) {
          const { data: prods } = await supabase.from("affiliate_products").select("id,product_name").in("id", ids)
          names = Object.fromEntries(((prods || []) as Array<{ id: string; product_name: string }>).map((p) => [p.id, p.product_name]))
        }
        return NextResponse.json({ recommendations: rows, names, migrated: true })
      } catch {
        return NextResponse.json({ recommendations: [], names: {}, migrated: false })
      }
    }
    if (section === "upsell-report") {
      // Conversion report from real events + paid orders (never fabricated).
      try {
        const { data: events, error } = await supabase
          .from("marketplace_events")
          .select("kind,product_id,created_at")
          .order("created_at", { ascending: false })
          .limit(5000)
        if (error) throw error
        const list = (events || []) as Array<{ kind: string; product_id: string | null; created_at: string }>
        const byKind: Record<string, number> = {}
        const byProduct: Record<string, number> = {}
        for (const e of list) {
          byKind[e.kind] = (byKind[e.kind] || 0) + 1
          if ((e.kind === "recommend_add" || e.kind === "bundle_add" || e.kind === "quickview_add") && e.product_id) {
            byProduct[e.product_id] = (byProduct[e.product_id] || 0) + 1
          }
        }
        const topIds = Object.entries(byProduct).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id)
        let topNames: Record<string, string> = {}
        if (topIds.length > 0) {
          const { data: prods } = await supabase.from("affiliate_products").select("id,product_name").in("id", topIds)
          topNames = Object.fromEntries(((prods || []) as Array<{ id: string; product_name: string }>).map((p) => [p.id, p.product_name]))
        }
        const { data: orders } = await supabase
          .from("marketplace_orders")
          .select("items,total_usd")
          .in("status", ["paid", "fulfilled", "delivered"])
          .limit(500)
        const paid = (orders || []) as Array<{ items: Array<{ id?: string; qty?: number }> | null; total_usd: number | null }>
        const multi = paid.filter((o) => Array.isArray(o.items) && o.items.length > 1).length
        const aov = paid.length > 0 ? paid.reduce((s, o) => s + (Number(o.total_usd) || 0), 0) / paid.length : 0
        return NextResponse.json({
          report: {
            byKind,
            totalEvents: list.length,
            topProducts: Object.entries(byProduct).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, n]) => ({ id, name: topNames[id] || id.slice(0, 8), adds: n })),
            paidOrders: paid.length,
            multiItemOrders: multi,
            aovUsd: Math.round(aov * 100) / 100,
          },
          migrated: true,
        })
      } catch {
        return NextResponse.json({ report: null, migrated: false })
      }
    }
    if (section === "cj-list") {
      const key = await resolveCjApiKey()
      if (!key) return NextResponse.json({ demo: true, list: [], total: 0, page: 1, pages: 1 })
      const q = String(url.searchParams.get("q") || "").trim()
      const page = Math.max(1, Number(url.searchParams.get("page") || "1"))
      const size = Math.min(100, Math.max(1, Number(url.searchParams.get("size") || "20")))
      const sort = (url.searchParams.get("sort") || "match") as "match" | "listings" | "price_asc" | "price_desc" | "new"
      const flag = (url.searchParams.get("flag") || "") as "" | "trending" | "new"
      // Category scoping: a search inside a department must never return a
      // product from another department.
      const category = url.searchParams.get("category") || null
      const subcategory = url.searchParams.get("subcategory") || null
      let filter: { names: string[]; lv2: string[]; lv3: string[]; matched: boolean } | null = null
      try {
        const { resolveCjCategoryFilter } = await import("@/lib/marketplace-category-db")
        filter = await resolveCjCategoryFilter(category, subcategory)
      } catch {
        filter = null
      }
      const res = await cjSearchProducts({
        keyWord: q || undefined,
        page,
        size,
        sort,
        flag: flag || undefined,
        categoryNames: filter?.names,
        lv2categoryList: filter?.lv2,
        // Only narrow to the leaf level when the list is short enough for the
        // request URL — a department can have hundreds of leaves.
        lv3categoryList: filter?.lv3 && filter.lv3.length <= 40 ? filter.lv3 : undefined,
      })
      // Guarantee the list matches what was searched for — never show an
      // unrelated product just because the supplier API was fuzzy.
      const list = q ? res.list.filter((p) => cjProductMatchesQuery(p, q)) : res.list
      // Tell the admin which of these are ALREADY live in the store, so a
      // product is never imported twice.
      const resultPids = list.map((p) => p.pid).filter(Boolean)
      let existing: string[] = []
      try {
        if (resultPids.length > 0) {
          const { data: ex } = await supabase
            .from("affiliate_products")
            .select("cj_pid")
            .in("cj_pid", resultPids.slice(0, 100))
          existing = (ex || []).map((e: { cj_pid: string }) => e.cj_pid)
        }
      } catch {
        existing = []
      }
      return NextResponse.json({
        demo: false,
        list,
        total: res.total,
        page: res.page,
        pages: res.pages,
        source: res.source,
        related: res.relatedCategories,
        matched: list.length,
        scoped: filter?.names || [],
        existing,
      })
    }
    // Our own best sellers for a department (no supplier call — instant).
    if (section === "cj-top") {
      const category = String(url.searchParams.get("category") || "").trim()
      const subcategory = String(url.searchParams.get("subcategory") || "").trim()
      let q = supabase
        .from("affiliate_products")
        .select("id,product_name,product_image_url,sale_price,original_price,clicks,conversions,category_slug,subcategory_slug,is_active")
        .eq("is_active", true)
        .order("clicks", { ascending: false })
        .order("conversions", { ascending: false })
        .limit(300)
      if (category) q = q.eq("category_slug", category)
      if (subcategory) q = q.eq("subcategory_slug", subcategory)
      const { data } = await q
      const rows = ((data || []) as Array<Record<string, unknown>>).map((p) => ({
        id: p.id,
        name: p.product_name,
        image: p.product_image_url,
        price: Number(p.sale_price) || 0,
        clicks: Number(p.clicks) || 0,
        conversions: Number(p.conversions) || 0,
      }))
      rows.sort((a, b) => b.clicks - a.clicks || b.conversions - a.conversions)
      return NextResponse.json({ top: rows.slice(0, 8) })
    }
    // feed-stats — eligibility report for the Google Merchant Center feed.
    if (section === "feed-stats") {
      const [{ count: totalCount }, { count: activeCount }] = await Promise.all([
        supabase.from("affiliate_products").select("id", { count: "exact", head: true }),
        supabase.from("affiliate_products").select("id", { count: "exact", head: true }).eq("is_active", true),
      ])
      const total = (totalCount as number | null) ?? 0
      const active = (activeCount as number | null) ?? 0
      // Walk active products (pages of 1000) to count feed-eligibility issues
      // without fabricating data: missing name, missing image, non-positive price.
      let missingName = 0
      let missingImage = 0
      let badPrice = 0
      let eligible = 0
      let from = 0
      const PAGE = 1000
      for (;;) {
        const { data } = await supabase
          .from("affiliate_products")
          .select("id,product_name,product_image_url,original_price,sale_price")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .range(from, from + PAGE - 1)
        const rows = (data || []) as Array<{
          product_name: string | null
          product_image_url: string | null
          original_price: number | null
          sale_price: number | null
        }>
        for (const p of rows) {
          const nameOk = Boolean(p.product_name?.trim())
          const imageOk = Boolean(p.product_image_url?.trim())
          const price = p.sale_price ?? p.original_price
          const priceOk = Number.isFinite(Number(price)) && Number(price) > 0
          if (nameOk && imageOk && priceOk) eligible++
          if (!nameOk) missingName++
          if (!imageOk) missingImage++
          if (!priceOk) badPrice++
        }
        if ((data || []).length < PAGE) break
        from += PAGE
      }
      return NextResponse.json({
        feedUrl: `${SITE_URL}/feeds/google-merchant-center`,
        total,
        active,
        eligible,
        excluded: Math.max(0, active - eligible),
        missingName,
        missingImage,
        badPrice,
      })
    }
    // overview — exact counts over the WHOLE catalogue. A plain .limit()
    // select silently capped this (2,873 live rows, only the newest 500
    // counted), and Supabase caps one page read at 1,000 rows, so use exact
    // head counts for the totals and walk the pages for the aggregates.
    const base = supabase.from("affiliate_products")
    const [{ count: totalCount }, { count: activeCount }, { count: featuredCount }] = await Promise.all([
      base.select("id", { count: "exact", head: true }),
      base.select("id", { count: "exact", head: true }).eq("is_active", true),
      base.select("id", { count: "exact", head: true }).eq("is_featured", true),
    ])
    const total = (totalCount as number | null) ?? 0
    const active = (activeCount as number | null) ?? 0
    const featured = (featuredCount as number | null) ?? 0
    const overviewRows: Array<{ clicks: number | null; conversions: number | null; program_key: string | null }> = []
    const OVERVIEW_PAGE = 1000
    for (let from = 0; from < total; from += OVERVIEW_PAGE) {
      const { data } = await base.select("clicks,conversions,program_key").range(from, from + OVERVIEW_PAGE - 1)
      overviewRows.push(...((data || []) as Array<{ clicks: number | null; conversions: number | null; program_key: string | null }>))
      if ((data || []).length < OVERVIEW_PAGE) break
    }
    const clicks = overviewRows.reduce((s, p) => s + (p.clicks || 0), 0)
    const conversions = overviewRows.reduce((s, p) => s + (p.conversions || 0), 0)
    const vendors = new Set(overviewRows.map((p) => p.program_key).filter(Boolean)).size
    const { data: pages } = await supabase.from("site_pages").select("slug,is_published").eq("slug", "marketplace").maybeSingle()
    return NextResponse.json({
      overview: {
        total,
        active,
        hidden: Math.max(0, total - active),
        featured,
        clicks,
        conversions,
        vendors,
        pagePublished: (pages as { is_published?: boolean } | null)?.is_published ?? true,
      },
    })
    // Admin-editable marketplace settings: base/display/checkout currency and
    // shipping thresholds. Read from site_settings (server-side, service role).
    if (section === "seasonal-sales") {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "marketplace_seasonal_sales")
        .maybeSingle()
      const val = (data as { value?: unknown } | null)?.value
      return NextResponse.json({ success: true, seasonalSales: val && typeof val === "object" ? val : { campaigns: [] } })
    }
    // ── Profit & pricing: category profit settings ───────────────────────
    if (section === "profit-categories") {
      const { data } = await supabase
        .from("marketplace_categories")
        .select("slug,name,depth,parent_slug,profit_margin_percent,min_profit_usd,pricing_rule")
        .order("depth", { ascending: true })
        .order("sort", { ascending: true })
      return NextResponse.json({ categories: data || [] })
    }
    // ── Profit & pricing: product profit overrides ───────────────────────
    if (section === "profit-products") {
      const { data } = await supabase
        .from("affiliate_products")
        .select("id,product_name,product_image_url,cost_usd,shipping_cost_usd,sale_price,original_price,profit_margin_percent,profit_override_usd,pricing_rule,category_slug")
        .order("product_name", { ascending: true })
        .limit(500)
      return NextResponse.json({ products: data || [] })
    }
    if (section === "market-settings") {
      const { data: cur } = await supabase.from("site_settings").select("value").eq("key", "marketplace_currency_settings").maybeSingle()
      const { data: ship } = await supabase.from("site_settings").select("value").eq("key", "marketplace_shipping_settings").maybeSingle()
      return NextResponse.json({
        currency: (cur as { value?: unknown } | null)?.value ?? {
          base: "USD",
          checkout: "USD",
          display: MARKET_CURRENCIES,
          available: MARKET_CURRENCIES,
        },
        shipping: (ship as { value?: unknown } | null)?.value ?? {
          freeShipThresholdUsd: 35,
          standardFlatUsd: 9,
          expressFlatUsd: 19,
          freightMarkup: 1.35,
        },
      })
    }
    // ── Shipping & Delivery: list zones ────────────────────────────────────
    if (section === "shipping-zones") {
      const { data, error } = await supabase
        .from("marketplace_shipping_zones")
        .select("id,name,countries,is_active,created_at")
        .order("created_at", { ascending: false })
      if (error) throw error
      return NextResponse.json({ zones: data || [] })
    }
    // ── Shipping & Delivery: list rates (optionally filtered by zone) ──────
    if (section === "shipping-rates") {
      const zoneId = url.searchParams.get("zone_id") || undefined
      let q = supabase
        .from("marketplace_shipping_rates")
        .select("id,zone_id,method_name,method_type,fee_usd,min_order_usd,eta,is_active,sort_order,created_at")
        .order("zone_id", { ascending: true })
        .order("sort_order", { ascending: true })
      if (zoneId) q = q.eq("zone_id", zoneId)
      const { data, error } = await q
      if (error) throw error
      return NextResponse.json({ rates: data || [] })
    }
    // ── Currency: list exchange rates (USD base) ───────────────────────────
    if (section === "exchange-rates") {
      const quote = url.searchParams.get("quote") || undefined
      let q = supabase
        .from("marketplace_exchange_rates")
        .select("base_currency,quote_currency,rate,fetched_at,provider")
        .order("quote_currency", { ascending: true })
      if (quote) q = q.eq("quote_currency", quote)
      const { data, error } = await q
      if (error) throw error
      return NextResponse.json({ rates: data || [] })
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load marketplace"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response
  const supabase = createServiceClient()
  try {
    const body = await request.json()
    // Save CJ API key to the server-only secret store
    if (body.action === "cj-save-key") {
      const key = String(body.apiKey || "").trim()
      if (!key) return NextResponse.json({ error: "API key required" }, { status: 400 })
      const { setSecret } = await import("@/lib/site-secrets")
      await setSecret("cj_api_key", key)
      const status = await cjStatus()
      return NextResponse.json({ success: true, status })
    }
    // Save payment gateway keys to the server-only secret store
    if (body.action === "pay-save-keys") {
      const secret = String(body.secret || "").trim()
      const pub = String(body.public || "").trim()
      const encryption = String(body.encryption || "").trim()
      const webhook = String(body.webhook || "").trim()
      if (secret && !secret.startsWith("FLWSECK")) return NextResponse.json({ error: "That secret key looks invalid — check and retry." }, { status: 400 })
      if (pub && !pub.startsWith("FLWPUBK")) return NextResponse.json({ error: "That public key looks invalid — check and retry." }, { status: 400 })
      if (secret.length < 20) return NextResponse.json({ error: "That secret key is too short to be a real gateway key." }, { status: 400 })
      if (!secret && !pub && !encryption && !webhook) return NextResponse.json({ error: "Paste at least one key." }, { status: 400 })
      // Verify the secret against the gateway BEFORE storing it, so a typo
      // never leaves checkout broken.
      let validation: { ok: boolean; message: string; mode: string } | null = null
      if (secret) {
        const { flutterwaveValidateSecret } = await import("@/lib/flutterwave")
        validation = await flutterwaveValidateSecret(secret)
        if (!validation.ok) return NextResponse.json({ error: validation.message, validation }, { status: 400 })
      }
      const { setSecret } = await import("@/lib/site-secrets")
      if (secret) await setSecret("flutterwave_secret_key", secret)
      if (pub) await setSecret("flutterwave_public_key", pub)
      if (encryption) await setSecret("flutterwave_encryption_key", encryption)
      if (webhook) await setSecret("flutterwave_secret_hash", webhook)
      return NextResponse.json({ success: true, validation })
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
      revalidateStore()
      return NextResponse.json({ order: data })
    }
    // Retry CJ auto-fulfillment for a paid order (uses shared helper, so
    // the attempt + error capture are identical to verify/webhook).
    if (body.action === "fulfill-retry") {
      const id = String(body.id || "")
      if (!id) return NextResponse.json({ error: "Order id required." }, { status: 400 })
      const { fulfillMarketplaceOrder } = await import("@/lib/marketplace-fulfill")
      const { data: order, error: fetchError } = await supabase.from("marketplace_orders").select("*").eq("id", id).maybeSingle()
      if (fetchError || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 })
      const o = order as { paystack_status?: string; cj_order_id?: string | null; status?: string; items?: Array<{ cj_sent?: boolean }> }
      if (o.paystack_status !== "paid") return NextResponse.json({ error: "Only paid orders can be fulfilled." }, { status: 400 })
      // Lines already sent to the supplier are never re-sent — a retry only
      // ships what is still outstanding (partial fulfillment).
      const items = Array.isArray(o.items) ? o.items : []
      const remaining = items.filter((l) => l?.cj_sent !== true)
      if (o.cj_order_id && remaining.length === 0) {
        return NextResponse.json({ error: "Already sent to CJ.", cj_order_id: o.cj_order_id }, { status: 400 })
      }
      const result = await fulfillMarketplaceOrder(supabase, order as never)
      if (result.cj_order_id) return NextResponse.json({ success: true, cj_order_id: result.cj_order_id })
      return NextResponse.json({ error: result.error || "Fulfillment failed — see order details." }, { status: 502 })
    }
    // Admin picks the supplier variant for an ambiguous order line
    // (e.g. 18Pro vs 18Pro Max) so Retry CJ fulfillment can succeed.
    if (body.action === "fulfill-set-variant") {
      const id = String(body.id || "")
      const lineId = String(body.line_id || "")
      const vid = String(body.cj_vid || "").slice(0, 80)
      if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(lineId) || !/^[A-Za-z0-9_-]{4,80}$/.test(vid)) {
        return NextResponse.json({ error: "Valid order id, line id and variant id are required." }, { status: 400 })
      }
      const { data: order, error: fetchError } = await supabase.from("marketplace_orders").select("id,items,cj_order_id").eq("id", id).maybeSingle()
      if (fetchError || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 })
      const o = order as { cj_order_id?: string | null; items?: Array<{ id?: string; cj_vid?: string | null; cj_sent?: boolean }> }
      const items = Array.isArray(o.items) ? o.items : []
      const target = items.find((l) => l?.id === lineId)
      // A line already handed to the supplier can never be changed.
      if (target?.cj_sent === true) {
        return NextResponse.json({ error: "That line was already sent to CJ — it can no longer be changed." }, { status: 400 })
      }
      let touched = 0
      const next = items.map((l) => {
        if (l?.id === lineId) {
          touched += 1
          return { ...l, cj_vid: vid }
        }
        return l
      })
      if (touched === 0) return NextResponse.json({ error: "That product is not on this order." }, { status: 400 })
      const { error } = await supabase.from("marketplace_orders").update({ items: next }).eq("id", id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      revalidateStore()
      return NextResponse.json({ success: true, updated: touched })
    }
    // Save storefront banners (hero / promo / category default / per-department)
    if (body.action === "banners-save") {
      const { parseBanners } = await import("@/lib/marketplace-banners")
      const banners = parseBanners(body.banners)
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "marketplace_banners", value: banners as unknown as never }, { onConflict: "key" })
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true, banners })
    }
    // Save the mobile homepage banner settings (banners + transition + upload),
    // independent of the desktop banner system.
    if (body.action === "mobile-banners-save") {
      const { parseMobileBanners } = await import("@/lib/marketplace-mobile-banners")
      const settings = parseMobileBanners(body.banners)
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: MARKETPLACE_MOBILE_BANNERS_KEY, value: settings as unknown as never }, { onConflict: "key" })
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true, banners: settings })
    }
    // Save mobile settings (promo notice, announcement strip, rotation interval)
    if (body.action === "mobile-settings-save") {
      const { parseMobileSettings } = await import("@/lib/marketplace-mobile")
      const settings = parseMobileSettings(body.settings)
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "marketplace_mobile", value: settings as unknown as never }, { onConflict: "key" })
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true, settings })
    }
    // Save Super Deals promotional configuration
    if (body.action === "super-deals-save") {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "marketplace_super_deals", value: body.superDeals as unknown as never }, { onConflict: "key" })
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true, superDeals: body.superDeals })
    }
    // Save Seasonal Sales campaign configuration (CRUD + status toggle).
    if (body.action === "seasonal-sales-save") {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "marketplace_seasonal_sales", value: body.seasonalSales as unknown as never }, { onConflict: "key" })
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true, seasonalSales: body.seasonalSales })
    }
    if (body.action === "seasonal-sales-delete") {
      const campaignId = String(body?.campaignId || "")
      if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 })
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "marketplace_seasonal_sales")
        .maybeSingle()
      const val = (data as { value?: unknown } | null)?.value as SeasonalSalesConfig | undefined
      const campaigns = Array.isArray(val?.campaigns) ? val.campaigns : []
      const next = campaigns.filter((c: { id: unknown }) => String(c.id) !== campaignId)
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "marketplace_seasonal_sales", value: { ...val, campaigns: next } as unknown as never }, { onConflict: "key" })
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true })
    }
    if (body.action === "seasonal-sales-status") {
      const campaignId = String(body?.campaignId || "")
      const status = String(body?.status || "")
      if (!campaignId || !["draft", "published", "paused", "expired"].includes(status)) {
        return NextResponse.json({ error: "campaignId and valid status required" }, { status: 400 })
      }
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "marketplace_seasonal_sales")
        .maybeSingle()
      const val = (data as { value?: unknown } | null)?.value as SeasonalSalesConfig | undefined
      const campaigns = Array.isArray(val?.campaigns) ? val.campaigns : []
      const next = campaigns.map((c: { id: unknown; status?: unknown }) =>
        String(c.id) === campaignId ? { ...c, status } : c
      )
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "marketplace_seasonal_sales", value: { ...val, campaigns: next } as unknown as never }, { onConflict: "key" })
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true })
    }
    // Save marketplace currency + shipping settings (base currency fixed to USD;
    // checkout currency fixed to USD; display currencies + free-ship threshold editable).
    if (body.action === "market-settings-save") {
      const currency = body.currency || {}
      const shipping = body.shipping || {}
      const display = Array.isArray(currency.display)
        ? currency.display.filter((c: string) => MARKET_CURRENCIES.includes(c as MarketCurrency))
        : MARKET_CURRENCIES
      const threshold = Number(shipping.freeShipThresholdUsd)
      if (!Number.isFinite(threshold) || threshold < 0) {
        return NextResponse.json({ error: "Free shipping threshold must be a number ≥ 0." }, { status: 400 })
      }
      await supabase
        .from("site_settings")
        .upsert({ key: "marketplace_currency_settings", value: { base: "USD", checkout: "USD", display, available: display } as unknown as never }, { onConflict: "key" })
      await supabase
        .from("site_settings")
        .upsert({ key: "marketplace_shipping_settings", value: { freeShipThresholdUsd: threshold, standardFlatUsd: Number(shipping.standardFlatUsd) || 9, expressFlatUsd: Number(shipping.expressFlatUsd) || 19, freightMarkup: Number(shipping.freightMarkup) || 1.35 } as unknown as never }, { onConflict: "key" })
      revalidateStore()
      return NextResponse.json({ success: true, currency: { base: "USD", checkout: "USD", display, available: display }, shipping: { freeShipThresholdUsd: threshold } })
    }
    // Save per-product sale countdowns (productId → ISO end)
    if (body.action === "sales-save") {
      const { parseMarketSales } = await import("@/lib/marketplace-sales")
      const sales = parseMarketSales(body.sales)
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "marketplace_sales", value: sales as unknown as never }, { onConflict: "key" })
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true, sales })
    }
    // Delete a customer review (spam / abuse moderation)
    if (body.action === "review-delete") {
      const id = String(body.id || "")
      if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Valid review id required." }, { status: 400 })
      const { error } = await supabase.from("marketplace_reviews").delete().eq("id", id)
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true })
    }
    // Save per-product merchandising flags (sale/new/bestseller) and/or the
    // store-wide sale_badges switch. Read-modify-write so a flags-only save
    // never wipes the global switch and vice versa.
    if (body.action === "merch-save") {
      const { parseMarketMerch, parseMarketMerchGlobal, MARKET_MERCH_GLOBAL_KEY } = await import("@/lib/marketplace-merch")
      const { data: current } = await supabase.from("site_settings").select("value").eq("key", "marketplace_merch").maybeSingle()
      const raw = ((current as { value?: unknown } | null)?.value ?? {}) as Record<string, unknown>
      const next: Record<string, unknown> = { ...raw }
      if (body.merch !== undefined) {
        const merch = parseMarketMerch(body.merch)
        for (const k of Object.keys(next)) {
          if (k !== MARKET_MERCH_GLOBAL_KEY) delete next[k]
        }
        Object.assign(next, merch)
      }
      if (typeof body.sale_badges === "boolean") {
        next[MARKET_MERCH_GLOBAL_KEY] = { sale_badges: body.sale_badges }
      }
      const out = { ...next }
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "marketplace_merch", value: out as unknown as never }, { onConflict: "key" })
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true, merch: parseMarketMerch(out), sale_badges: parseMarketMerchGlobal(out) })
    }
    // Bulk merchandising save: apply the same sale flag + percentage to many
    // products at once (admin selects multiple products in the Products tab).
    if (body.action === "bulk-merch-save") {
      const { parseMarketMerch, MARKET_MERCH_GLOBAL_KEY } = await import("@/lib/marketplace-merch")
      const { data: current } = await supabase.from("site_settings").select("value").eq("key", "marketplace_merch").maybeSingle()
      const raw = ((current as { value?: unknown } | null)?.value ?? {}) as Record<string, unknown>
      const next: Record<string, unknown> = { ...raw }
      const productIds: string[] = Array.isArray(body.product_ids) ? body.product_ids.filter((id: unknown) => /^[0-9a-f-]{36}$/i.test(String(id))).map(String) : []
      const sale = typeof body.sale === "boolean" ? body.sale : undefined
      const sale_pct = Number.isFinite(Number(body.sale_pct)) && Number(body.sale_pct) > 0 && Number(body.sale_pct) < 100 ? Math.round(Number(body.sale_pct)) : undefined
      if (productIds.length === 0) return NextResponse.json({ error: "No valid product ids provided." }, { status: 400 })
      if (sale === undefined && sale_pct === undefined) return NextResponse.json({ error: "Nothing to set." }, { status: 400 })
      for (const id of productIds) {
        const cur = parseMarketMerch(next[id] ?? null)
        next[id] = { ...cur, ...(sale === undefined ? {} : { sale }), ...(sale_pct === undefined ? {} : { sale_pct }) }
      }
      // Drop products whose flags are now empty (keeps the store tidy).
      for (const id of Object.keys(next)) {
        if (id === MARKET_MERCH_GLOBAL_KEY) continue
        const f = next[id] as Record<string, unknown> | undefined
        if (f && Object.keys(f).length === 0) delete next[id]
      }
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "marketplace_merch", value: next as unknown as never }, { onConflict: "key" })
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true, merch: parseMarketMerch(next), updated: productIds.length })
    }
    // Replace the whole coupon list (validated item by item)
    if (body.action === "coupons-save") {
      const { parseMarketCoupons } = await import("@/lib/marketplace-coupons")
      const coupons = parseMarketCoupons(body.coupons)
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "marketplace_coupons", value: coupons as unknown as never }, { onConflict: "key" })
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true, coupons, updated: coupons.length })
    }
    // ── Email: save a template ─────────────────────────────────────────────
    if (body.action === "email-templates-save") {
      const id = String(body.id || "")
      const name = String(body.name || "").trim().slice(0, 100)
      const eventType = String(body.event_type || "").trim().slice(0, 60)
      const subject = String(body.subject || "").trim().slice(0, 200)
      const htmlContent = String(body.html_content || "")
      const isActive = typeof body.is_active === "boolean" ? body.is_active : true
      if (!name || !eventType || !subject) {
        return NextResponse.json({ error: "Name, event type and subject are required." }, { status: 400 })
      }
      const patch = { name, event_type: eventType, subject, html_content: htmlContent, is_active: isActive }
      let res
      if (id) {
        res = await supabase.from("marketplace_email_templates").update(patch).eq("id", id).select().single()
      } else {
        res = await supabase.from("marketplace_email_templates").insert(patch).select().single()
      }
      if (res.error) throw res.error
      revalidateStore()
      return NextResponse.json({ success: true, template: res.data })
    }
    // ── Email: delete a template ───────────────────────────────────────────
    if (body.action === "email-templates-delete") {
      const id = String(body.id || "")
      if (!id) return NextResponse.json({ error: "Template id required." }, { status: 400 })
      const { error } = await supabase.from("marketplace_email_templates").delete().eq("id", id)
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true })
    }
    // ── Seller commissions: save a commission rule ─────────────────────────
    if (body.action === "seller-commissions-save") {
      const id = String(body.id || "")
      const sellerId = String(body.seller_id || "")
      const categorySlug = String(body.category_slug || "").slice(0, 90) || null
      const subcategorySlug = String(body.subcategory_slug || "").slice(0, 90) || null
      const commissionPercent = Number(body.commission_percent)
      const minCommissionUsd = Number(body.min_commission_usd)
      if (!sellerId) return NextResponse.json({ error: "Seller id required." }, { status: 400 })
      if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
        return NextResponse.json({ error: "Commission must be 0–100." }, { status: 400 })
      }
      if (!Number.isFinite(minCommissionUsd) || minCommissionUsd < 0) {
        return NextResponse.json({ error: "Min commission must be ≥ 0." }, { status: 400 })
      }
      const patch = { seller_id: sellerId, category_slug: categorySlug, subcategory_slug: subcategorySlug, commission_percent: commissionPercent, min_commission_usd: minCommissionUsd }
      let res
      if (id) {
        res = await supabase.from("marketplace_seller_commissions").update(patch).eq("id", id).select().single()
      } else {
        res = await supabase.from("marketplace_seller_commissions").insert(patch).select().single()
      }
      if (res.error) throw res.error
      revalidateStore()
      return NextResponse.json({ success: true, commission: res.data })
    }
    // ── Seller commissions: delete a rule ──────────────────────────────────
    if (body.action === "seller-commissions-delete") {
      const id = String(body.id || "")
      if (!id) return NextResponse.json({ error: "Commission id required." }, { status: 400 })
      const { error } = await supabase.from("marketplace_seller_commissions").delete().eq("id", id)
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true })
    }
    // ── Shipping & Delivery: save a zone ───────────────────────────────────
    if (body.action === "shipping-zones-save") {
      const id = String(body.id || "")
      const name = String(body.name || "").trim().slice(0, 80)
      const countries = Array.isArray(body.countries) ? body.countries.filter((c: unknown) => typeof c === "string").map(String).slice(0, 200) : []
      const isActive = typeof body.is_active === "boolean" ? body.is_active : true
      if (!name) return NextResponse.json({ error: "Zone name required." }, { status: 400 })
      if (countries.length === 0) return NextResponse.json({ error: "Pick at least one country." }, { status: 400 })
      const patch = { name, countries, is_active: isActive }
      let res
      if (id) {
        res = await supabase.from("marketplace_shipping_zones").update(patch).eq("id", id).select().single()
      } else {
        res = await supabase.from("marketplace_shipping_zones").insert(patch).select().single()
      }
      if (res.error) throw res.error
      revalidateStore()
      return NextResponse.json({ success: true, zone: res.data })
    }
    // ── Shipping & Delivery: delete a zone (and its rates) ─────────────────
    if (body.action === "shipping-zones-delete") {
      const id = String(body.id || "")
      if (!id) return NextResponse.json({ error: "Zone id required." }, { status: 400 })
      const { error } = await supabase.from("marketplace_shipping_zones").delete().eq("id", id)
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true })
    }
    // ── Shipping & Delivery: save a rate ───────────────────────────────────
    if (body.action === "shipping-rates-save") {
      const id = String(body.id || "")
      const zoneId = String(body.zone_id || "")
      const methodName = String(body.method_name || "").trim().slice(0, 80)
      const methodType = String(body.method_type || "standard")
      const feeUsd = Number(body.fee_usd)
      const minOrderUsd = Number(body.min_order_usd)
      const eta = String(body.eta || "").trim().slice(0, 40)
      const isActive = typeof body.is_active === "boolean" ? body.is_active : true
      const sortOrder = Number(body.sort_order) || 0
      if (!zoneId) return NextResponse.json({ error: "Zone required." }, { status: 400 })
      if (!methodName) return NextResponse.json({ error: "Method name required." }, { status: 400 })
      if (!["standard", "express", "free", "supplier"].includes(methodType)) {
        return NextResponse.json({ error: "Invalid method type." }, { status: 400 })
      }
      if (!Number.isFinite(feeUsd) || feeUsd < 0) return NextResponse.json({ error: "Fee must be ≥ 0." }, { status: 400 })
      if (!Number.isFinite(minOrderUsd) || minOrderUsd < 0) return NextResponse.json({ error: "Min order must be ≥ 0." }, { status: 400 })
      const patch = { zone_id: zoneId, method_name: methodName, method_type: methodType, fee_usd: feeUsd, min_order_usd: minOrderUsd, eta, is_active: isActive, sort_order: sortOrder }
      let res
      if (id) {
        res = await supabase.from("marketplace_shipping_rates").update(patch).eq("id", id).select().single()
      } else {
        res = await supabase.from("marketplace_shipping_rates").insert(patch).select().single()
      }
      if (res.error) throw res.error
      revalidateStore()
      return NextResponse.json({ success: true, rate: res.data })
    }
    // ── Shipping & Delivery: delete a rate ─────────────────────────────────
    if (body.action === "shipping-rates-delete") {
      const id = String(body.id || "")
      if (!id) return NextResponse.json({ error: "Rate id required." }, { status: 400 })
      const { error } = await supabase.from("marketplace_shipping_rates").delete().eq("id", id)
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true })
    }
    // ── Currency: save an exchange rate ────────────────────────────────────
    if (body.action === "exchange-rates-save") {
      const base = String(body.base_currency || "USD").toUpperCase().slice(0, 3)
      const quote = String(body.quote_currency || "").toUpperCase().slice(0, 3)
      const rate = Number(body.rate)
      const provider = String(body.provider || "manual").slice(0, 40)
      if (!quote) return NextResponse.json({ error: "Quote currency required." }, { status: 400 })
      if (!Number.isFinite(rate) || rate <= 0) return NextResponse.json({ error: "Rate must be > 0." }, { status: 400 })
      const { error } = await supabase
        .from("marketplace_exchange_rates")
        .upsert(
          { base_currency: base, quote_currency: quote, rate, provider, fetched_at: new Date().toISOString() },
          { onConflict: "base_currency,quote_currency" }
        )
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true, base, quote, rate, provider })
    }
    // ── Currency: delete an exchange rate ──────────────────────────────────
    if (body.action === "exchange-rates-delete") {
      const base = String(body.base_currency || "USD").toUpperCase().slice(0, 3)
      const quote = String(body.quote_currency || "").toUpperCase().slice(0, 3)
      if (!quote) return NextResponse.json({ error: "Quote currency required." }, { status: 400 })
      const { error } = await supabase
        .from("marketplace_exchange_rates")
        .delete()
        .eq("base_currency", base)
        .eq("quote_currency", quote)
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true })
    }
    // Curated "Complete Your Purchase" overrides (migration 094 tables).
    if (body.action === "recommend-add") {
      const primary = String(body.primary_id || "")
      const rec = String(body.recommended_id || "")
      if (!/^[0-9a-f-]{36}$/i.test(primary) || !/^[0-9a-f-]{36}$/i.test(rec) || primary === rec) {
        return NextResponse.json({ error: "Two different valid product ids are required." }, { status: 400 })
      }
      try {
        const { data: existing } = await supabase
          .from("marketplace_recommendations")
          .select("position")
          .eq("primary_id", primary)
          .order("position", { ascending: false })
          .limit(1)
        const pos = ((existing || []) as Array<{ position: number }>)[0]?.position
        const { data, error } = await supabase
          .from("marketplace_recommendations")
          .upsert({ primary_id: primary, recommended_id: rec, position: (pos ?? -1) + 1, is_active: true }, { onConflict: "primary_id,recommended_id" })
          .select("id")
          .single()
        if (error) throw error
        revalidateStore()
        return NextResponse.json({ success: true, recommendation: data })
      } catch {
        return NextResponse.json({ error: "Recommendations table not migrated yet — apply migration 094 first." }, { status: 500 })
      }
    }
    if (body.action === "recommend-remove") {
      const id = String(body.id || "")
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
      const { error } = await supabase.from("marketplace_recommendations").delete().eq("id", id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      revalidateStore()
      return NextResponse.json({ success: true })
    }
    if (body.action === "recommend-toggle") {
      const id = String(body.id || "")
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
      const { data, error } = await supabase
        .from("marketplace_recommendations")
        .update({ is_active: body.is_active !== false })
        .eq("id", id)
        .select("id,is_active")
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      revalidateStore()
      return NextResponse.json({ success: true, recommendation: data })
    }
    // Save store contact info (footer address / phone / email)
    if (body.action === "store-save") {      const { sanitizeStore } = await import("@/lib/marketplace-store")
      const store = sanitizeStore(body.store)
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "marketplace_store", value: store as unknown as never }, { onConflict: "key" })
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true, store })
    }
    // ── Profit & pricing: save category profit settings ──────────────────
    if (body.action === "profit-categories-save") {
      const slug = String(body.slug || "")
      if (!slug || slug.length > 90) return NextResponse.json({ error: "Valid category slug required." }, { status: 400 })
      const margin = Number(body.profit_margin_percent)
      const minProfit = Number(body.min_profit_usd)
      const rule = String(body.pricing_rule || "category")
      if (!Number.isFinite(margin) || margin < 0 || margin > 100) {
        return NextResponse.json({ error: "Margin must be 0–100." }, { status: 400 })
      }
      if (!Number.isFinite(minProfit) || minProfit < 0) {
        return NextResponse.json({ error: "Minimum profit must be ≥ 0." }, { status: 400 })
      }
      const { data, error } = await supabase
        .from("marketplace_categories")
        .update({ profit_margin_percent: margin, min_profit_usd: minProfit, pricing_rule: rule })
        .eq("slug", slug)
        .select("slug,name,profit_margin_percent,min_profit_usd,pricing_rule")
        .single()
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true, row: data })
    }
    // ── Profit & pricing: save product profit overrides ──────────────────
    if (body.action === "profit-products-save") {
      const id = String(body.id || "")
      if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Valid product id required." }, { status: 400 })
      const cost = Number(body.cost_usd)
      const ship = Number(body.shipping_cost_usd)
      const sale = Number(body.sale_price)
      const margin = ruleMargin(body.profit_margin_percent)
      const override = ruleOverride(body.profit_override_usd)
      const rule = String(body.pricing_rule || "category")
      if (!Number.isFinite(cost) || cost < 0) return NextResponse.json({ error: "Cost must be ≥ 0." }, { status: 400 })
      if (!Number.isFinite(ship) || ship < 0) return NextResponse.json({ error: "Shipping cost must be ≥ 0." }, { status: 400 })
      if (!Number.isFinite(sale) || sale < 0) return NextResponse.json({ error: "Sale price must be ≥ 0." }, { status: 400 })
      if (rule === "override" && (margin == null || !Number.isFinite(margin) || margin < 0 || margin > 100)) {
        return NextResponse.json({ error: "Override margin must be 0–100." }, { status: 400 })
      }
      if (rule === "override" && (override == null || !Number.isFinite(override) || override < 0)) {
        return NextResponse.json({ error: "Override profit must be ≥ 0." }, { status: 400 })
      }
      const { data, error } = await supabase
        .from("affiliate_products")
        .update({ cost_usd: cost, shipping_cost_usd: ship, sale_price: sale, profit_margin_percent: margin, profit_override_usd: override, pricing_rule: rule })
        .eq("id", id)
        .select("id,product_name,cost_usd,shipping_cost_usd,sale_price,profit_margin_percent,profit_override_usd,pricing_rule")
        .single()
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true, product: data })
    }
    // ── Category tree CRUD (Admin → Marketplace → Categories) ───────────
    if (body.action === "category-sync") {
      const { codeTreeRows, clearMarketplaceTreeCache } = await import("@/lib/marketplace-category-db")
      const rows = codeTreeRows()
      // Insert-only: an admin's renames/hides are never overwritten.
      const { error } = await supabase
        .from("marketplace_categories")
        .upsert(rows as unknown as never[], { onConflict: "slug", ignoreDuplicates: true })
      if (error) throw error
      clearMarketplaceTreeCache()
      revalidateStore()
      return NextResponse.json({ success: true, synced: rows.length })
    }
    if (body.action === "category-add") {
      const { slugify } = await import("@/lib/marketplace-categories")
      const { depthOfLevel, clearMarketplaceTreeCache } = await import("@/lib/marketplace-category-db")
      const name = String(body.name || "").trim().slice(0, 80)
      if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 })
      const level = (["dept", "sub", "leaf"].includes(body.level) ? body.level : "leaf") as "dept" | "sub" | "leaf"
      const parent = body.parent_slug ? String(body.parent_slug).slice(0, 80) : null
      if (level !== "dept" && !parent) {
        return NextResponse.json({ error: "Pick the parent category first." }, { status: 400 })
      }
      const slug = slugify(String(body.slug || name))
      if (!slug) return NextResponse.json({ error: "That name has no usable slug." }, { status: 400 })
      const { data: dupe } = await supabase.from("marketplace_categories").select("slug").eq("slug", slug).maybeSingle()
      if (dupe) return NextResponse.json({ error: `"${slug}" already exists.` }, { status: 400 })
      const { data: maxRow } = await supabase
        .from("marketplace_categories")
        .select("sort")
        .order("sort", { ascending: false })
        .limit(1)
        .maybeSingle()
      const sort = Number((maxRow as { sort?: number } | null)?.sort ?? 0) + 1
      const { data, error } = await supabase
        .from("marketplace_categories")
        .insert({
          slug,
          name,
          parent_slug: parent,
          depth: depthOfLevel(level),
          icon: body.icon ? String(body.icon).slice(0, 40) : null,
          image_url: body.image ? String(body.image).slice(0, 400) : null,
          sort,
          is_active: true,
        })
        .select()
        .single()
      if (error) throw error
      clearMarketplaceTreeCache()
      revalidateStore()
      return NextResponse.json({ success: true, row: data })
    }
    if (body.action === "category-update") {
      const { slugify } = await import("@/lib/marketplace-categories")
      const { clearMarketplaceTreeCache } = await import("@/lib/marketplace-category-db")
      const slug = String(body.slug || "")
      if (!slug || slug.length > 90) return NextResponse.json({ error: "Valid category slug required." }, { status: 400 })
      const patch: Record<string, unknown> = {}
      if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 80)
      if (typeof body.new_slug === "string" && body.new_slug.trim()) {
        const nextSlug = slugify(body.new_slug)
        if (!nextSlug) return NextResponse.json({ error: "That slug is not usable." }, { status: 400 })
        const { data: dupe } = await supabase.from("marketplace_categories").select("slug").eq("slug", nextSlug).neq("slug", slug).maybeSingle()
        if (dupe) return NextResponse.json({ error: `"${nextSlug}" already exists.` }, { status: 400 })
        patch.slug = nextSlug
      }
      if (typeof body.is_active === "boolean") patch.is_active = body.is_active
      if (typeof body.sort === "number" && Number.isFinite(body.sort)) patch.sort = Math.round(body.sort)
      if (typeof body.icon === "string") patch.icon = body.icon.slice(0, 40) || null
      if (typeof body.image === "string") patch.image_url = body.image.slice(0, 400) || null
      if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 })
      const nextSlug = typeof patch.slug === "string" ? patch.slug : null
      // A rename must carry the children with it: the parent_slug FK is not
      // deferrable, so the children are detached, the parent is renamed and
      // the children are re-attached to the new slug.
      let childSlugs: string[] = []
      if (nextSlug && nextSlug !== slug) {
        const { data: kids } = await supabase.from("marketplace_categories").select("slug").eq("parent_slug", slug)
        childSlugs = (kids || []).map((k) => (k as { slug: string }).slug)
        if (childSlugs.length > 0) {
          await supabase.from("marketplace_categories").update({ parent_slug: null }).eq("parent_slug", slug)
        }
      }
      const { data, error } = await supabase.from("marketplace_categories").update(patch).eq("slug", slug).select().single()
      if (error) {
        // Roll the detached children back onto the original parent.
        if (childSlugs.length > 0) {
          await supabase.from("marketplace_categories").update({ parent_slug: slug }).in("slug", childSlugs)
        }
        throw error
      }
      if (nextSlug && nextSlug !== slug) {
        // Re-attach the children to the renamed parent.
        if (childSlugs.length > 0) {
          await supabase.from("marketplace_categories").update({ parent_slug: nextSlug }).in("slug", childSlugs)
        }
        await supabase.from("affiliate_products").update({ category_slug: nextSlug }).eq("category_slug", slug)
        await supabase.from("affiliate_products").update({ subcategory_slug: nextSlug }).eq("subcategory_slug", slug)
        // Department artwork + sidebar artwork are keyed by slug.
        const { data: bannerRow } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "marketplace_banners")
          .maybeSingle()
        const raw = (bannerRow as { value?: unknown } | null)?.value
        if (raw && typeof raw === "object") {
          const banners = raw as Record<string, unknown>
          let touched = false
          for (const bucket of ["departments", "sidebar_banners"]) {
            const map = banners[bucket]
            if (!map || typeof map !== "object" || Array.isArray(map)) continue
            const rec = map as Record<string, unknown>
            if (rec[slug] !== undefined) {
              rec[nextSlug] = rec[slug]
              delete rec[slug]
              touched = true
            }
          }
          if (touched) {
            await supabase
              .from("site_settings")
              .upsert({ key: "marketplace_banners", value: banners as unknown as never }, { onConflict: "key" })
          }
        }
      }
      clearMarketplaceTreeCache()
      revalidateStore()
      return NextResponse.json({ success: true, row: data })
    }
    if (body.action === "category-delete") {
      const { clearMarketplaceTreeCache } = await import("@/lib/marketplace-category-db")
      const slug = String(body.slug || "")
      if (!slug || slug.length > 90) return NextResponse.json({ error: "Valid category slug required." }, { status: 400 })
      const { data: row } = await supabase.from("marketplace_categories").select("slug,depth").eq("slug", slug).maybeSingle()
      if (!row) return NextResponse.json({ error: "Category not found." }, { status: 404 })
      const r = row as { slug: string; depth: number }
      // Remove the branch: a department takes its subcategories, a
      // subcategory takes its leaves. (The parent FK is ON DELETE SET NULL,
      // so children must be removed explicitly.)
      if (r.depth === 0) {
        const { data: subs } = await supabase.from("marketplace_categories").select("slug").eq("parent_slug", r.slug)
        for (const s of (subs || []) as Array<{ slug: string }>) {
          await supabase.from("marketplace_categories").delete().eq("parent_slug", s.slug)
        }
        await supabase.from("marketplace_categories").delete().eq("parent_slug", r.slug)
      } else if (r.depth === 1) {
        await supabase.from("marketplace_categories").delete().eq("parent_slug", r.slug)
      }
      const { error } = await supabase.from("marketplace_categories").delete().eq("slug", slug)
      if (error) throw error
      clearMarketplaceTreeCache()
      revalidateStore()
      return NextResponse.json({ success: true })
    }
    // Populate empty categories — for every department/subcategory/leaf with
    // zero products, search CJ and import a batch of qualified products so no
    // category on the storefront is ever empty.
    if (body.action === "populate-categories") {
      const { fetchMarketplaceTree } = await import("@/lib/marketplace-category-db")
      const { cjSearchProducts, cjGetProductDetail, mapCjToAffiliate } = await import("@/lib/cj")
      const { codeTreeRows, clearMarketplaceTreeCache } = await import("@/lib/marketplace-category-db")
      const { MARKET_DEPARTMENTS } = await import("@/lib/marketplace-categories")

      const targetSlug = body.category_slug ? String(body.category_slug).slice(0, 90) : null
      const limitPerCat = Math.min(Math.max(Number(body.limit) || 12, 1), 40)

      const departments = await fetchMarketplaceTree()
      const allCategories: Array<{ slug: string; name: string; depth: number; parent: string | null }> = []
      const walk = (deps: MarketDepartment[], parent: string | null) => {
        for (const d of deps) {
          allCategories.push({ slug: d.slug, name: d.name, depth: 0, parent })
          for (const s of d.subs) {
            allCategories.push({ slug: s.slug, name: s.name, depth: 1, parent: d.slug })
            for (const l of s.items) {
              allCategories.push({ slug: l.slug, name: l.name, depth: 2, parent: s.slug })
            }
          }
        }
      }
      walk(departments, null)

      const targets = targetSlug ? allCategories.filter((c) => c.slug === targetSlug) : allCategories

      const results: Array<{ slug: string; name: string; existing: number; imported: number; skipped: number }> = []
      let totalImported = 0

      for (const cat of targets) {
        // Count existing products for this category
        const [{ count: existingCount }] = await Promise.all([
          supabase
            .from("affiliate_products")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true)
            .or(`category_slug.eq.${cat.slug},subcategory_slug.eq.${cat.slug}`),
        ])
        const existing = existingCount ?? 0
        if (existing > 0) {
          results.push({ slug: cat.slug, name: cat.name, existing, imported: 0, skipped: 0 })
          continue
        }

        // Search CJ for products in this category
        let cjList: Array<{ pid: string; productNameEn: string; productImage: string; sellPrice: number; categoryFirstName: string; categorySecondName: string; sku: string }> = []
        try {
          const keyName = cat.depth === 0 ? cat.name : cat.depth === 1 ? `${departments.find((d) => d.subs.some((s) => s.slug === cat.parent))?.name} > ${cat.name}` : cat.name
          const searchRes = await cjSearchProducts({
            keyWord: cat.name,
            page: 1,
            size: limitPerCat,
            sort: "match",
          })
          cjList = (searchRes.list || []).map((p) => ({
            pid: String(p.pid || ""),
            productNameEn: String(p.productNameEn || ""),
            productImage: String(p.productImage || ""),
            sellPrice: Number(p.sellPrice) || 0,
            categoryFirstName: String(p.categoryFirstName || ""),
            categorySecondName: String(p.categorySecondName || ""),
            sku: String(p.sku || ""),
          })).filter((c) => c.pid)
        } catch {
          // CJ unreachable — skip this category
          results.push({ slug: cat.slug, name: cat.name, existing: 0, imported: 0, skipped: 0 })
          continue
        }

        if (cjList.length === 0) {
          results.push({ slug: cat.slug, name: cat.name, existing: 0, imported: 0, skipped: 0 })
          continue
        }

        // Duplicate guard
        const pids = cjList.map((c) => c.pid)
        const { data: dupRows } = await supabase
          .from("affiliate_products")
          .select("cj_pid")
          .in("cj_pid", pids.slice(0, 200))
        const existingPids = new Set((dupRows || []).map((r) => r.cj_pid).filter(Boolean))
        const fresh = cjList.filter((c) => !existingPids.has(c.pid))

        if (fresh.length === 0) {
          results.push({ slug: cat.slug, name: cat.name, existing: 0, imported: 0, skipped: cjList.length })
          continue
        }

        // Hydrate variants (best effort)
        const withVid = new Map<string, string>()
        const skuByPid = new Map<string, string>()
        for (const cj of fresh.slice(0, 8)) {
          try {
            const product = await cjGetProductDetail(cj.pid)
            const priced = (product.variants || [])
              .map((v) => ({ vid: String(v.vid || ""), price: Number(v.variantSellPrice) || 0 }))
              .filter((v) => v.vid)
              .sort((a, b) => a.price - b.price)
            if (priced.length > 0) withVid.set(cj.pid, priced[0].vid)
            if (product.sku) skuByPid.set(cj.pid, product.sku)
          } catch {
            // best effort
          }
          await new Promise((r) => setTimeout(r, 150))
        }

        // Map category slugs
        let categorySlug: string | null = cat.slug
        let subcategorySlug: string | null = null
        if (cat.depth === 1) {
          subcategorySlug = cat.slug
          // Find parent dept slug
          const parentDept = departments.find((d) => d.subs.some((s) => s.slug === cat.slug))
          categorySlug = parentDept?.slug || null
        } else if (cat.depth === 2) {
          subcategorySlug = cat.slug
          const parentSub = departments.flatMap((d) => d.subs).find((s) => s.items.some((i) => i.slug === cat.slug))
          const parentDept = departments.find((d) => d.subs.some((s) => s.slug === parentSub?.slug))
          categorySlug = parentDept?.slug || null
        }

        const rows = fresh.map((cj) =>
          mapCjToAffiliate(cj, {
            categorySlug,
            subcategorySlug,
            cjVid: withVid.get(cj.pid) || null,
            cjSku: skuByPid.get(cj.pid) || cj.sku || null,
          })
        )

        if (rows.length === 0) {
          results.push({ slug: cat.slug, name: cat.name, existing: 0, imported: 0, skipped: fresh.length })
          continue
        }

        const { data, error } = await supabase.from("affiliate_products").insert(rows).select("id")
        if (error) throw error
        const imported = data?.length ?? 0
        totalImported += imported
        results.push({ slug: cat.slug, name: cat.name, existing: 0, imported, skipped: fresh.length - imported })
      }

      clearMarketplaceTreeCache()
      revalidateStore()
      return NextResponse.json({
        success: true,
        totalImported,
        categories: results,
        message: `Populated ${results.filter((r) => r.imported > 0).length} empty category/categories with ${totalImported} products.`,
      })
    }
    if (body.action === "cj-import") {
      const items: unknown[] = Array.isArray(body.items) ? (body.items as unknown[]) : []
      if (items.length === 0) return NextResponse.json({ error: "No items to import" }, { status: 400 })
      if (items.length > 200) return NextResponse.json({ error: "Max 200 per batch" }, { status: 400 })
      const clean: Array<{
        pid: string
        productNameEn: string
        productImage: string
        sellPrice: number
        categoryFirstName: string
        categorySecondName: string
        sku: string
      }> = items
        .map((raw) => {
          const cj = (raw || {}) as Record<string, unknown>
          return {
            pid: String(cj.pid || "").trim(),
            productNameEn: String(cj.productNameEn || ""),
            productImage: String(cj.productImage || ""),
            sellPrice: Number(cj.sellPrice) || 0,
            categoryFirstName: String(cj.categoryFirstName || ""),
            categorySecondName: String(cj.categorySecondName || ""),
            sku: String(cj.sku || ""),
          }
        })
        .filter((cj) => !!cj.pid)
      if (clean.length === 0) return NextResponse.json({ error: "No valid products in the selection." }, { status: 400 })

      // ── Duplicate guard ────────────────────────────────────────────────
      // A product that is already live in the store must never be added a
      // second time. We match on the CJ product id first, then on the SKU
      // and finally on an identical product name — and we tell the admin
      // exactly which ones were skipped.
      const pids = clean.map((c) => c.pid)
      const skus = clean.map((c) => c.sku).filter(Boolean)
      const names = clean.map((c) => c.productNameEn).filter(Boolean)
      const dupByPid = new Map<string, { id: string; name: string; live: boolean }>()
      // (a) same CJ product id
      const { data: dupPidRows } = await supabase
        .from("affiliate_products")
        .select("id,cj_pid,product_name,is_active")
        .in("cj_pid", pids.slice(0, 200))
      for (const r of (dupPidRows || []) as Array<{ id: string; cj_pid: string | null; product_name: string; is_active: boolean }>) {
        if (r.cj_pid) dupByPid.set(r.cj_pid, { id: r.id, name: r.product_name, live: r.is_active !== false })
      }
      // (b) same supplier SKU — the same product can be reached through a
      // different CJ product id
      if (skus.length > 0) {
        const { data: dupSkuRows } = await supabase
          .from("affiliate_products")
          .select("id,cj_sku,product_name,is_active")
          .in("cj_sku", skus.slice(0, 200))
        for (const r of (dupSkuRows || []) as Array<{ id: string; cj_sku: string | null; product_name: string; is_active: boolean }>) {
          if (!r.cj_sku) continue
          const pid = clean.find((c) => c.sku === r.cj_sku)?.pid
          if (pid && !dupByPid.has(pid)) dupByPid.set(pid, { id: r.id, name: r.product_name, live: r.is_active !== false })
        }
      }
      // (c) identical product name (the same product imported from another source)
      if (names.length) {
        const nameLookup = new Map(
          names.map((n) => [n.trim().toLowerCase(), clean.find((c) => c.productNameEn === n)?.pid || ""])
        )
        const { data: nameRows } = await supabase
          .from("affiliate_products")
          .select("id,cj_pid,product_name,is_active")
          .in("product_name", names.slice(0, 200))
        for (const r of (nameRows || []) as Array<{ id: string; cj_pid: string | null; product_name: string; is_active: boolean }>) {
          const pid = nameLookup.get(r.product_name.trim().toLowerCase())
          if (pid && !dupByPid.has(pid)) dupByPid.set(pid, { id: r.id, name: r.product_name, live: r.is_active !== false })
        }
      }
      const duplicates = clean
        .filter((c) => dupByPid.has(c.pid))
        .map((c) => {
          const d = dupByPid.get(c.pid)!
          return { pid: c.pid, name: c.productNameEn, existingId: d.id, existingName: d.name, live: d.live }
        })
      const freshItems = clean.filter((c) => !dupByPid.has(c.pid))

      // Store the default supplier variant so orders auto-fulfill without an
      // admin picking a variant by hand, and add the product to CJ "My
      // Products" so it shows up in the CJ platform as one of our store
      // products. CJ throttles variant lookups, so we stagger them.
      const { cjGetProductDetail, cjAddToMyProduct } = await import("@/lib/cj")
      const CJ_BUDGET = 12
      const hydrate = freshItems.slice(0, CJ_BUDGET)
      const withVid = new Map<string, string>()
      const skuByPid = new Map<string, string>()
      const pushed: string[] = []
      const pushFailed: string[] = []
      for (const cj of hydrate) {
        try {
          const product = await cjGetProductDetail(cj.pid)
          const priced = (product.variants || [])
            .map((v) => ({ vid: String(v.vid || ""), price: Number(v.variantSellPrice) || 0 }))
            .filter((v) => v.vid)
            .sort((a, b) => a.price - b.price)
          if (priced.length > 0) withVid.set(cj.pid, priced[0].vid)
          if (product.sku) skuByPid.set(cj.pid, product.sku)
        } catch {
          // variant lookup is best effort — the product still imports
        }
        // Push into CJ "My Products" (idempotent). 100002 means CJ does not
        // know that pid any more — the product still imports locally.
        try {
          const r = await cjAddToMyProduct(cj.pid)
          if (r.ok) pushed.push(cj.pid)
          else pushFailed.push(cj.pid)
        } catch {
          pushFailed.push(cj.pid)
        }
        // CJ rate-limits; give the supplier API a moment between products.
        if (hydrate.length > 1) await new Promise((r) => setTimeout(r, 200))
      }

      const rows = freshItems.map((cj) =>
        mapCjToAffiliate(cj, {
          categorySlug: body.categorySlug || null,
          subcategorySlug: body.subcategorySlug || null,
          cjVid: withVid.get(cj.pid) || null,
          cjSku: skuByPid.get(cj.pid) || cj.sku || null,
        })
      )
      if (rows.length === 0) {
        return NextResponse.json({
          imported: 0,
          skipped: clean.length,
          duplicates,
          variants: 0,
          pushed: 0,
          pushFailed: 0,
          deferred: 0,
        })
      }
      const { data, error } = await supabase.from("affiliate_products").insert(rows).select("id")
      if (error) throw error
      revalidateStore()

      // ── Record import history (batch + items) ──────────────────────────
      let batchId: string | null = null
      try {
        const batchRes = await supabase
          .from("marketplace_cj_import_batches")
          .insert({
            imported_by: auth.user.id,
            category_slug: body.categorySlug || null,
            subcategory_slug: body.subcategorySlug || null,
            requested: clean.length,
            imported: data?.length ?? 0,
            skipped: duplicates.length,
            variants_filled: withVid.size,
            pushed_to_cj: pushed.length,
            deferred: freshItems.length - hydrate.length,
            status: data?.length ? "completed" : "failed",
            error_message: null,
          })
          .select("id")
          .single()
        batchId = batchRes.data?.id ?? null
      } catch {
        // history is best-effort — the import already succeeded
      }
      if (batchId && data) {
        const itemRows = rows.map((r, i) => ({
          batch_id: batchId,
          cj_pid: (freshItems[i]?.pid ?? r.cj_pid) || "",
          cj_sku: (freshItems[i]?.sku ?? r.cj_sku) || null,
          product_name: freshItems[i]?.productNameEn ?? r.product_name,
          product_image_url: (freshItems[i]?.productImage ?? r.product_image_url) || null,
          sell_price_usd: freshItems[i]?.sellPrice ?? null,
          category_slug: r.category_slug || null,
          subcategory_slug: r.subcategory_slug || null,
          cj_vid: r.cj_vid || null,
          status: "imported",
        }))
        await supabase.from("marketplace_cj_import_items").insert(itemRows)
      }
      // ── duplicates deferred rows (best-effort history) ─────────────────
      if (batchId && duplicates.length > 0) {
        await supabase
          .from("marketplace_cj_import_items")
          .insert(
            duplicates.map((d) => ({
              batch_id: batchId,
              cj_pid: d.pid,
              product_name: d.existingName || d.name,
              status: "duplicate_skipped",
            }))
          )
      }

      return NextResponse.json({
        imported: data?.length ?? 0,
        skipped: duplicates.length,
        duplicates,
        variants: withVid.size,
        pushed: pushed.length,
        pushFailed: pushFailed.length,
        deferred: freshItems.length - hydrate.length,
      })
    }
    // ── CJ maintenance: variants, "My Products" and order sync ───────────
    // Fill in the supplier variant for every product that is missing one.
    // Without a variant an order can never be placed with CJ — this is what
    // made multi-item orders sit in "manual_needed" forever.
    if (body.action === "cj-backfill-variants") {
      const { cjGetProductDetail } = await import("@/lib/cj")
      // This route has a 60s ceiling, so a click fills a batch and the next
      // click continues with the products that still have no variant.
      const limit = Math.min(Number(body.limit) || 20, 40)
      const { data: rows } = await supabase
        .from("affiliate_products")
        .select("id,cj_pid,cj_vid")
        .not("cj_pid", "is", null)
        .is("cj_vid", null)
        .limit(limit)
      const list = (rows || []) as Array<{ id: string; cj_pid: string; cj_vid: string | null }>
      let filled = 0
      const failed: string[] = []
      for (const p of list) {
        try {
          const product = await cjGetProductDetail(p.cj_pid)
          const priced = (product.variants || [])
            .map((v) => ({ vid: String(v.vid || ""), price: Number(v.variantSellPrice) || 0 }))
            .filter((v) => v.vid)
            .sort((a, b) => a.price - b.price)
          if (priced.length > 0) {
            const patch: Record<string, unknown> = { cj_vid: priced[0].vid }
            if (product.sku) patch.cj_sku = product.sku
            const { error } = await supabase.from("affiliate_products").update(patch).eq("id", p.id)
            if (!error) filled += 1
            else failed.push(p.cj_pid)
          } else {
            failed.push(p.cj_pid)
          }
        } catch {
          failed.push(p.cj_pid)
        }
        await new Promise((r) => setTimeout(r, 200))
      }
      revalidateStore()
      let remaining = 0
      try {
        const { count } = await supabase
          .from("affiliate_products")
          .select("id", { count: "exact", head: true })
          .not("cj_pid", "is", null)
          .is("cj_vid", null)
        remaining = count || 0
      } catch {
        remaining = 0
      }
      return NextResponse.json({ scanned: list.length, filled, failed: failed.length, remaining })
    }
    // Add every imported product to CJ "My Products" so the CJ platform shows
    // them as products in our store. Progress is recorded in our own database
    // (cj_pushed_at), so the button is resumable: the next click starts past
    // whatever this click already pushed.
    if (body.action === "cj-push-my-products") {
      const { cjAddToMyProduct, cjGetMyProducts } = await import("@/lib/cj")
      // Bounded per click — this route has a 60s ceiling. The next click
      // continues with whatever is still missing.
      const limit = Math.min(Number(body.limit) || 20, 40)
      const { count: unpushedCount } = await supabase
        .from("affiliate_products")
        .select("id", { count: "exact", head: true })
        .not("cj_pid", "is", null)
        .eq("is_active", true)
        .is("cj_pushed_at", null)
      const unpushed = (unpushedCount as number | null) ?? 0
      const { data: rows } = await supabase
        .from("affiliate_products")
        .select("id,cj_pid")
        .not("cj_pid", "is", null)
        .eq("is_active", true)
        .is("cj_pushed_at", null)
        .order("created_at", { ascending: true })
        .limit(limit)
      const batch = ((rows || []) as Array<{ id: string; cj_pid: string }>)
      let pushed = 0
      let already = 0
      const failed: string[] = []
      const done: string[] = []
      for (const p of batch) {
        try {
          const r = await cjAddToMyProduct(p.cj_pid)
          if (r.ok) {
            if (r.already) already += 1
            else pushed += 1
            done.push(p.id)
          } else {
            failed.push(p.cj_pid)
          }
        } catch {
          failed.push(p.cj_pid)
        }
        await new Promise((r) => setTimeout(r, 200))
      }
      if (done.length > 0) {
        await supabase
          .from("affiliate_products")
          .update({ cj_pushed_at: new Date().toISOString() })
          .in("id", done)
      }
      const { count: pushedTotalCount } = await supabase
        .from("affiliate_products")
        .select("id", { count: "exact", head: true })
        .not("cj_pid", "is", null)
        .eq("is_active", true)
        .not("cj_pushed_at", "is", null)
      const pushedTotal = (pushedTotalCount as number | null) ?? 0
      let mine = 0
      try {
        mine = (await cjGetMyProducts({ size: 100 })).total
      } catch {
        // ignore
      }
      revalidateStore()
      return NextResponse.json({
        scanned: batch.length,
        pushed,
        already,
        failed: failed.length,
        myProducts: mine,
        remaining: Math.max(0, unpushed - (pushed + already)),
        pushedTotal,
      })
    }
    // ── Retry a failed / partial CJ import batch ─────────────────────────
    if (body.action === "cj-retry-import") {
      const batchId = String(body.batch_id || "")
      if (!/^[0-9a-f-]{36}$/i.test(batchId)) {
        return NextResponse.json({ error: "Valid batch id required." }, { status: 400 })
      }
      const { data: batch } = await supabase
        .from("marketplace_cj_import_batches")
        .select("*")
        .eq("id", batchId)
        .maybeSingle()
      if (!batch) return NextResponse.json({ error: "Import batch not found." }, { status: 404 })
      const items = await supabase
        .from("marketplace_cj_import_items")
        .select("*")
        .eq("batch_id", batchId)
        .neq("status", "imported")
        .order("created_at", { ascending: true })
        .limit(200)
      const retryItems = (items.data || []) as Array<{
        cj_pid: string
        cj_sku: string | null
        product_name: string
        product_image_url: string | null
        sell_price_usd: number | null
        category_slug: string | null
        subcategory_slug: string | null
        cj_vid: string | null
        status: string
      }>
      if (retryItems.length === 0) {
        return NextResponse.json({ error: "Nothing to retry in this batch." }, { status: 400 })
      }
      // Convert to the shape the import flow expects
      const clean = retryItems.map((it) => ({
        pid: it.cj_pid,
        productNameEn: it.product_name,
        productImage: it.product_image_url || "",
        sellPrice: Number(it.sell_price_usd) || 0,
        categoryFirstName: "",
        categorySecondName: "",
        sku: it.cj_sku || "",
      }))
      // Call the same import path by re-using the cj-import action logic
      // inline: duplicate guard + insert + history record
      const pids = clean.map((c) => c.pid).filter(Boolean)
      const skus = clean.map((c) => c.sku).filter(Boolean)
      const names = clean.map((c) => c.productNameEn).filter(Boolean)
      const dupByPid = new Map<string, { id: string; name: string; live: boolean }>()
      const { data: dupPidRows } = await supabase
        .from("affiliate_products")
        .select("id,cj_pid,product_name,is_active")
        .in("cj_pid", pids.slice(0, 200))
      for (const r of (dupPidRows || []) as Array<{ id: string; cj_pid: string | null; product_name: string; is_active: boolean }>) {
        if (r.cj_pid) dupByPid.set(r.cj_pid, { id: r.id, name: r.product_name, live: r.is_active !== false })
      }
      if (skus.length > 0) {
        const { data: dupSkuRows } = await supabase
          .from("affiliate_products")
          .select("id,cj_sku,product_name,is_active")
          .in("cj_sku", skus.slice(0, 200))
        for (const r of (dupSkuRows || []) as Array<{ id: string; cj_sku: string | null; product_name: string; is_active: boolean }>) {
          if (!r.cj_sku) continue
          const pid = clean.find((c) => c.sku === r.cj_sku)?.pid
          if (pid && !dupByPid.has(pid)) dupByPid.set(pid, { id: r.id, name: r.product_name, live: r.is_active !== false })
        }
      }
      const duplicates = clean.filter((c) => dupByPid.has(c.pid))
      const freshItems = clean.filter((c) => !dupByPid.has(c.pid))
      if (freshItems.length === 0) {
        return NextResponse.json({ imported: 0, skipped: duplicates.length, duplicates, message: "All items already exist in the store." })
      }
      const { cjGetProductDetail, cjAddToMyProduct } = await import("@/lib/cj")
      const withVid = new Map<string, string>()
      const skuByPid = new Map<string, string>()
      const pushed: string[] = []
      for (const cj of freshItems.slice(0, 12)) {
        try {
          const product = await cjGetProductDetail(cj.pid)
          const priced = (product.variants || [])
            .map((v) => ({ vid: String(v.vid || ""), price: Number(v.variantSellPrice) || 0 }))
            .filter((v) => v.vid)
            .sort((a, b) => a.price - b.price)
          if (priced.length > 0) withVid.set(cj.pid, priced[0].vid)
          if (product.sku) skuByPid.set(cj.pid, product.sku)
        } catch {}
        try {
          const r = await cjAddToMyProduct(cj.pid)
          if (r.ok) pushed.push(cj.pid)
        } catch {}
        await new Promise((r) => setTimeout(r, 200))
      }
      const rows = freshItems.map((cj) =>
        mapCjToAffiliate(cj, {
          categorySlug: batch.category_slug || null,
          subcategorySlug: batch.subcategory_slug || null,
          cjVid: withVid.get(cj.pid) || null,
          cjSku: skuByPid.get(cj.pid) || cj.sku || null,
        })
      )
      const { data, error } = await supabase.from("affiliate_products").insert(rows).select("id")
      if (error) throw error
      revalidateStore()
      // Record retry as a new batch linked to the original
      const { data: newBatch } = await supabase
        .from("marketplace_cj_import_batches")
        .insert({
          imported_by: auth.user.id,
          category_slug: batch.category_slug,
          subcategory_slug: batch.subcategory_slug,
          requested: retryItems.length,
          imported: data?.length ?? 0,
          skipped: duplicates.length,
          variants_filled: withVid.size,
          pushed_to_cj: pushed.length,
          deferred: freshItems.length - Math.min(freshItems.length, 12),
          status: data?.length ? "completed" : "failed",
          error_message: null,
        })
        .select("id")
        .single()
      if (newBatch && data) {
        await supabase
          .from("marketplace_cj_import_items")
          .insert(
            rows.map((r, i) => ({
              batch_id: newBatch.id,
              cj_pid: (freshItems[i]?.pid ?? r.cj_pid) || "",
              cj_sku: (freshItems[i]?.sku ?? r.cj_sku) || null,
              product_name: freshItems[i]?.productNameEn ?? r.product_name,
              product_image_url: (freshItems[i]?.productImage ?? r.product_image_url) || null,
              sell_price_usd: freshItems[i]?.sellPrice ?? null,
              category_slug: r.category_slug || null,
              subcategory_slug: r.subcategory_slug || null,
              cj_vid: r.cj_vid || null,
              status: "imported",
            }))
          )
      }
      return NextResponse.json({
        imported: data?.length ?? 0,
        skipped: duplicates.length,
        duplicates,
        variants: withVid.size,
        pushed: pushed.length,
        deferred: freshItems.length - Math.min(freshItems.length, 12),
        retriedFrom: batchId,
      })
    }
    // The products CJ knows as ours, and the orders CJ has for us.
    if (body.action === "cj-my-products") {
      const { cjGetMyProducts, cjListOrders } = await import("@/lib/cj")
      const [mine, orders] = await Promise.all([
        cjGetMyProducts({ size: 50 }),
        cjListOrders({ size: 50 }),
      ])
      return NextResponse.json({ products: mine, orders })
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
    revalidateStore()
    return NextResponse.json({ product: data })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create product"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response
  const supabase = createServiceClient()
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
    revalidateStore()
    return NextResponse.json({ product: data })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to update product"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response
  const supabase = createServiceClient()
  try {
    const body = await request.json()
    if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const { error } = await supabase.from("affiliate_products").delete().eq("id", body.id)
    if (error) throw error
    revalidateStore()
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
  const supabase = createServiceClient()
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
    revalidateStore()
    return NextResponse.json({ success: true, is_published })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to update page"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── Profit & pricing helper: parse an optional margin percent ─────────────
function ruleMargin(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null
}

// ── Profit & pricing helper: parse an optional override profit (USD) ────────
function ruleOverride(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : null
}
