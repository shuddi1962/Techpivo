import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { ad_id, placement_id, campaign_id, source } = body

    const forwarded = request.headers.get("x-forwarded-for")
    const ip = forwarded?.split(",")[0]?.trim() || "unknown"
    const userAgent = request.headers.get("user-agent") || ""

    if (ad_id) {
      const { data: ad } = await supabase
        .from("ads")
        .select("impressions")
        .eq("id", ad_id)
        .single()

      if (ad) {
        await supabase
          .from("ads")
          .update({ impressions: (ad.impressions || 0) + 1 })
          .eq("id", ad_id)
      }
    }

    if (placement_id) {
      const { data: placement } = await supabase
        .from("ad_placements")
        .select("impressions")
        .eq("id", placement_id)
        .single()

      if (placement) {
        await supabase
          .from("ad_placements")
          .update({ impressions: (placement.impressions || 0) + 1 })
          .eq("id", placement_id)
      }
    }

    if (campaign_id) {
      const { data: campaign } = await supabase
        .from("ad_campaigns")
        .select("impressions")
        .eq("id", campaign_id)
        .single()

      if (campaign) {
        await supabase
          .from("ad_campaigns")
          .update({ impressions: (campaign.impressions || 0) + 1 })
          .eq("id", campaign_id)
      }
    }

    if (source) {
      const today = new Date().toISOString().slice(0, 10)
      const { data: existing } = await supabase
        .from("ad_revenue")
        .select("id, impressions")
        .eq("source", source)
        .eq("date", today)
        .single()

      if (existing) {
        await supabase
          .from("ad_revenue")
          .update({ impressions: (existing.impressions || 0) + 1 })
          .eq("id", existing.id)
      } else {
        await supabase
          .from("ad_revenue")
          .insert({
            source,
            impressions: 1,
            clicks: 0,
            revenue: 0,
            date: today,
          })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Impression tracking error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
