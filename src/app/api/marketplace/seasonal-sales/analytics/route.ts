import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

interface SeasonalSalesConfig {
  campaigns: Array<{
    id: string
    analytics?: { impressions?: number; clicks?: number; addToCart?: number }
    [key: string]: unknown
  }>
  [key: string]: unknown
}

async function readConfig(supabase: ReturnType<typeof createAdmin>) {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "marketplace_seasonal_sales")
    .maybeSingle()
  const val = (data as { value?: unknown } | null)?.value
  if (val && typeof val === "object") return val as SeasonalSalesConfig
  return { campaigns: [] } as SeasonalSalesConfig
}

export async function POST(request: NextRequest) {
  const supabase = createAdmin()
  try {
    const body = await request.json().catch(() => null)
    const action = String(body?.action || "")
    const campaignId = String(body?.campaignId || "")
    const productId = String(body?.productId || "")
    if (!campaignId) {
      return NextResponse.json({ error: "campaignId required" }, { status: 400 })
    }

    const config = await readConfig(supabase)
    const campaigns = Array.isArray(config.campaigns) ? config.campaigns : []
    const campaign = campaigns.find((c) => String(c.id) === campaignId)
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }
    campaign.analytics ||= {}
    const a = campaign.analytics
    if (action === "impression") a.impressions = Number(a.impressions ?? 0) + 1
    else if (action === "click") a.clicks = Number(a.clicks ?? 0) + 1
    else if (action === "addToCart") a.addToCart = Number(a.addToCart ?? 0) + 1
    else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }

    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "marketplace_seasonal_sales", value: config as unknown as never }, { onConflict: "key" })
    if (error) throw error
    return NextResponse.json({ success: true, analytics: a })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Analytics update failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const supabase = createAdmin()
  try {
    const config = await readConfig(supabase)
    const campaigns = Array.isArray(config.campaigns) ? config.campaigns : []
    const analytics = campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      impressions: c.analytics?.impressions ?? 0,
      clicks: c.analytics?.clicks ?? 0,
      addToCart: c.analytics?.addToCart ?? 0,
    }))
    return NextResponse.json({ success: true, analytics })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load analytics"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
