// Black Friday / seasonal automatic discount selection (server-side only).
//
// Analyses eligible TechPivo-owned products and selects suitable products
// for Black Friday discounts — preserving the configured minimum profit
// margin. Never discounts below the admin's floor unless a loss-leader is
// explicitly approved.

import { createClient as createAdmin } from "@/lib/supabase/admin"

interface CandidateProduct {
  id: string
  product_name: string
  product_image_url: string | null
  sale_price: number | null
  original_price: number | null
  cost_usd: number | null
  shipping_cost_usd: number
  category_slug: string | null
  subcategory_slug: string | null
  is_active: boolean
  stock_quantity: number
  clicks: number | null
  conversions: number | null
}

interface CategoryProfit {
  slug: string
  name: string
  profit_margin_percent: number | null
  min_profit_usd: number
  pricing_rule: string
}

interface DiscountSuggestion {
  product_id: string
  product_name: string
  product_image_url: string | null
  category_slug: string | null
  original_price: number
  suggested_discount_pct: number
  promotional_price: number
  supplier_cost: number
  shipping_cost: number
  remaining_margin_pct: number
  remaining_profit_usd: number
  meets_min_profit: boolean
  reason: string
}

/** Gross margin = (sale − cost − shipping) / sale × 100. */
function grossMargin(sale: number, cost: number, ship: number): number {
  if (!sale || sale <= 0) return 0
  return ((sale - cost - ship) / sale) * 100
}

/** Selling price for a target gross margin: price = (cost + ship) / (1 − margin). */
function priceForMargin(cost: number, ship: number, marginPct: number): number {
  const m = marginPct / 100
  if (m >= 1) return cost + ship + 1
  return (cost + ship) / (1 - m)
}

/** Max discount % that keeps remaining margin ≥ minMarginPct. */
function maxSafeDiscount(
  sale: number,
  cost: number,
  ship: number,
  minMarginPct: number,
): { pct: number; price: number; marginPct: number; profitUsd: number } {
  const costTotal = cost + ship
  const minPrice = priceForMargin(cost, ship, minMarginPct)
  // Max discount that keeps price ≥ minPrice:
  // sale × (1 − d) ≥ minPrice  →  d ≤ 1 − minPrice/sale
  let pct = sale > 0 ? Math.max(0, Math.min(100, (1 - minPrice / sale) * 100)) : 0
  const price = Math.max(minPrice, sale * (1 - pct / 100))
  const marginPct = grossMargin(price, cost, ship)
  const profitUsd = price - costTotal
  return { pct: Math.round(pct * 10) / 10, price: Math.round(price * 100) / 100, marginPct, profitUsd }
}

export interface BlackFridayPlan {
  campaignStart: string
  campaignEnd: string
  generatedAt: string
  totalCandidates: number
  suggested: DiscountSuggestion[]
  byTier: {
    standard: DiscountSuggestion[]   // 5–10%
    strong: DiscountSuggestion[]     // 10–15%
    flash: DiscountSuggestion[]      // 15–20%
    clearance: DiscountSuggestion[]  // 20–30%
  }
}

/**
 * Build a proposed Black Friday campaign from live catalogue data.
 *
 * Rules:
 * 1. Only active products with a known supplier cost are eligible.
 * 2. Discount never breaches the category's min_profit_usd (or 10% default).
 * 3. Discount tier is chosen by how much margin headroom exists.
 * 4. Products with no cost data are excluded (can't compute profit safely).
 * 5. Out-of-stock products are excluded.
 */
export async function buildBlackFridayPlan(): Promise<BlackFridayPlan> {
  const supabase = createAdmin()
  const now = new Date().toISOString()

  // Campaign window: Africa/Lagos (UTC+1), Nov 19–30 2026, end 23:59 WAT.
  const campaignStart = "2026-11-19T00:00:00+01:00"
  const campaignEnd = "2026-11-30T23:59:00+01:00"

  // Fetch all active products with cost data.
  const { data: products } = await supabase
    .from("affiliate_products")
    .select("id,product_name,product_image_url,sale_price,original_price,cost_usd,shipping_cost_usd,category_slug,subcategory_slug,is_active,stock,clicks,conversions")
    .eq("is_active", true)
    .not("cost_usd", "is", null)
    .order("clicks", { ascending: false })
    .order("conversions", { ascending: false })
    .limit(2000)

  const rows = ((products || []) as unknown as CandidateProduct[]).filter((p) => {
    const sale = Number(p.sale_price ?? p.original_price ?? 0)
    const cost = Number(p.cost_usd ?? 0)
    const ship = Number(p.shipping_cost_usd ?? 0)
    const stock = Number(p.stock_quantity ?? 0)
    return sale > 0 && cost >= 0 && stock > 0
  })

  // Fetch category profit settings for min-profit floors.
  const { data: catRows } = await supabase
    .from("marketplace_categories")
    .select("slug,profit_margin_percent,min_profit_usd,pricing_rule")
  const catBySlug = new Map<string, CategoryProfit>()
  for (const c of (catRows || []) as CategoryProfit[]) {
    catBySlug.set(c.slug, c)
  }

  const suggested: DiscountSuggestion[] = []

  for (const p of rows) {
    const sale = Number(p.sale_price ?? p.original_price ?? 0)
    const cost = Number(p.cost_usd ?? 0)
    const ship = Number(p.shipping_cost_usd ?? 0)
    const cat = catBySlug.get(p.category_slug || "")
    const minMarginPct = cat?.profit_margin_percent != null ? Number(cat.profit_margin_percent) : 10
    const minProfitUsd = cat?.min_profit_usd != null ? Number(cat.min_profit_usd) : 0

    // Compute the max safe discount preserving min margin.
    const safe = maxSafeDiscount(sale, cost, ship, minMarginPct)

    // Also enforce min profit per unit in USD.
    if (safe.profitUsd < minProfitUsd) continue

    // No headroom → skip.
    if (safe.pct <= 0) continue

    const discountPct = safe.pct
    const promoPrice = safe.price
    const remainingMargin = safe.marginPct
    const remainingProfit = safe.profitUsd
    const meetsMin = remainingMargin >= minMarginPct && remainingProfit >= minProfitUsd

    // Assign tier by discount depth.
    let tier: "standard" | "strong" | "flash" | "clearance"
    let reason: string
    if (discountPct >= 20) {
      tier = "clearance"
      reason = "Deep margin headroom — clearance pricing"
    } else if (discountPct >= 15) {
      tier = "flash"
      reason = "Strong margin headroom — flash sale candidate"
    } else if (discountPct >= 10) {
      tier = "strong"
      reason = "Good sales performance — strong deal"
    } else {
      tier = "standard"
      reason = "Moderate headroom — standard deal"
    }

    // Boost tier for high-velocity products (clicks + conversions).
    const velocity = (Number(p.clicks ?? 0) + Number(p.conversions ?? 0) * 10)
    if (velocity > 50 && tier === "standard") {
      tier = "strong"
      reason = "High buyer interest — upgraded to strong deal"
    }

    suggested.push({
      product_id: p.id,
      product_name: p.product_name,
      product_image_url: p.product_image_url,
      category_slug: p.category_slug,
      original_price: sale,
      suggested_discount_pct: discountPct,
      promotional_price: promoPrice,
      supplier_cost: cost,
      shipping_cost: ship,
      remaining_margin_pct: Math.round(remainingMargin * 10) / 10,
      remaining_profit_usd: Math.round(remainingProfit * 100) / 100,
      meets_min_profit: meetsMin,
      reason,
    })
  }

  // Sort: biggest safe discount first, then by velocity.
  suggested.sort((a, b) => b.suggested_discount_pct - a.suggested_discount_pct || b.original_price - a.original_price)

  const byTier = {
    standard: suggested.filter((s) => s.suggested_discount_pct >= 5 && s.suggested_discount_pct < 10),
    strong: suggested.filter((s) => s.suggested_discount_pct >= 10 && s.suggested_discount_pct < 15),
    flash: suggested.filter((s) => s.suggested_discount_pct >= 15 && s.suggested_discount_pct < 20),
    clearance: suggested.filter((s) => s.suggested_discount_pct >= 20),
  }

  return {
    campaignStart,
    campaignEnd,
    generatedAt: now,
    totalCandidates: rows.length,
    suggested,
    byTier,
  }
}

export type { DiscountSuggestion }
