import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdminRole, createServiceClient } from "@/lib/admin-auth"
import { cjListProducts, cjProductMatchesQuery, cjSearchProducts, cjStatus, mapCjToAffiliate, resolveCjApiKey } from "@/lib/cj"

// All database work in this route runs through the service-role client.
// The route is admin-guarded by `requireAdminRole`, and several marketplace
// tables (affiliate_products) only have a public READ policy — a session
// (RLS-bound) client therefore silently updates 0 rows and every write
// failed with "Failed to update product".

// The CJ import/search round-trip is slow (auth + supplier catalogue +
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
    // Replace the whole coupon list (validated item by item)
    if (body.action === "coupons-save") {
      const { parseMarketCoupons } = await import("@/lib/marketplace-coupons")
      const coupons = parseMarketCoupons(body.coupons)
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "marketplace_coupons", value: coupons as unknown as never }, { onConflict: "key" })
      if (error) throw error
      revalidateStore()
      return NextResponse.json({ success: true, coupons })
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
      return NextResponse.json({
        imported: data?.length ?? 0,
        skipped: duplicates.length,
        duplicates,
        variants: withVid.size,
        pushed: pushed.length,
        pushFailed: pushFailed.length,
        // Products beyond the CJ budget of this request — they still import,
        // they just need the "Fill missing variants" / "Push products to CJ"
        // buttons (which resume where this stopped).
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
