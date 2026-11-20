import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdmin } from "@/lib/supabase/admin"
import { buildBlackFridayPlan, type DiscountSuggestion } from "@/lib/marketplace-black-friday"
import { checkRateLimit, clientIp } from "@/lib/rate-limiter"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// GET /api/marketplace/black-friday — generate a proposed campaign plan.
// Analyses live catalogue data and suggests products + discounts that
// preserve category profit floors. Nothing is published — the admin
// previews and approves before anything goes live.
export async function GET(request: NextRequest) {
  const limit = checkRateLimit(`mkt_bf_plan_${clientIp(request)}`, { limit: 30, windowMs: 60 * 1000 })
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }
  try {
    const plan = await buildBlackFridayPlan()
    return NextResponse.json({ success: true, plan })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Plan generation failed."
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/marketplace/black-friday — save an approved campaign plan
// to site_settings.marketplace_black_friday (seasonal-sales-compatible shape).
// Body: { campaigns: DiscountSuggestion[], name?, startAt?, endAt? }
export async function POST(request: NextRequest) {
  const limit = checkRateLimit(`mkt_bf_save_${clientIp(request)}`, { limit: 10, windowMs: 60 * 1000 })
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }
  const supabase = createAdmin()
  try {
    const body = await request.json()
    const { campaigns, name, startAt, endAt } = body
    if (!Array.isArray(campaigns)) {
      return NextResponse.json({ error: "campaigns array required." }, { status: 400 })
    }

    const resolvedStartAt = startAt || "2026-11-19T00:00:00+01:00"
    const resolvedEndAt = endAt || "2026-11-30T23:59:00+01:00"

    const plan = {
      id: `black-friday-${Date.now()}`,
      name: name || "Black Friday 2026",
      heading: "Black Friday 2026.",
      subtitle: "November 19 – 30 · TechPivo Market",
      description: "Biggest sale of the year — up to 30% off across electronics, accessories and gadgets.",
      status: "published",
      startAt: resolvedStartAt,
      endAt: resolvedEndAt,
      timezone: "Africa/Lagos",
      countdownEnabled: true,
      countdownStyle: "boxes",
      accentColor: "#EF4444",
      products: campaigns.map((c: DiscountSuggestion, i) => ({
        productId: c.product_id,
        name: c.product_name,
        image: c.product_image_url || "",
        originalPrice: c.original_price,
        promotionalPrice: c.promotional_price,
        badge: c.suggested_discount_pct >= 20 ? "CLEARANCE" : c.suggested_discount_pct >= 15 ? "FLASH SALE" : "SPECIAL OFFER",
        badgeText: `-${c.suggested_discount_pct}%`,
        badgeColor: "#EF4444",
        priority: i + 1,
        enabled: true,
        startAt: resolvedStartAt,
        endAt: resolvedEndAt,
      })),
      settings: {
        sectionVisibility: true,
        sectionHeading: "Black Friday Deals.",
        sectionSubtitle: "November 19 – 30",
        desktopLayout: "banner-left",
        tabletLayout: "banner-left",
        mobileLayout: "stacked",
        cardSpacing: "md",
        imagePresentation: "cover",
        borderRadius: "xl",
        cardShadow: "sm",
        badgeStyle: "pill",
        priceColor: "#EF4444",
        countdownAppearance: "boxes",
        carouselArrows: true,
        paginationDots: true,
        autoRotation: false,
        transitionSpeed: 4,
        visibleProducts: 8,
        mobileProductsPerView: 2,
      },
      maxProducts: campaigns.length,
      displayLimit: Math.min(campaigns.length, 8),
    }

    // Read existing seasonal sales config and append/replace the BF campaign.
    const { data: existing } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "marketplace_seasonal_sales")
      .maybeSingle()
    const val = (existing as { value?: unknown } | null)?.value as { campaigns?: unknown[] } | null
    const campaignsArr = Array.isArray(val?.campaigns) ? val.campaigns : []
    // Remove any existing BF campaign with same name, then append.
    const next = campaignsArr.filter((c: any) => String(c.name || "") !== plan.name)
    next.push(plan)

    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "marketplace_seasonal_sales", value: { campaigns: next } as unknown as never }, { onConflict: "key" })
    if (error) throw error

    return NextResponse.json({ success: true, campaign: plan, imported: campaigns.length })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Save failed."
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
