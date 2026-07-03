import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { link_id, post_id, ad_id, campaign_id, type } = body

    const forwarded = request.headers.get("x-forwarded-for")
    const ip = forwarded?.split(",")[0]?.trim() || "unknown"
    const userAgent = request.headers.get("user-agent") || ""
    const referrer = request.headers.get("referer") || ""

    if (type === "affiliate" && link_id) {
      const { error: clickError } = await supabase
        .from("affiliate_clicks")
        .insert({
          link_id,
          post_id: post_id || null,
          ip_address: ip,
          user_agent: userAgent,
          referrer: referrer,
        })

      if (clickError) {
        console.error("Failed to record affiliate click:", clickError)
      }

      const { data: link } = await supabase
        .from("affiliate_links")
        .select("total_clicks")
        .eq("id", link_id)
        .single()

      if (link) {
        await supabase
          .from("affiliate_links")
          .update({ total_clicks: (link.total_clicks || 0) + 1, updated_at: new Date().toISOString() })
          .eq("id", link_id)
      }

      return NextResponse.json({ success: true, type: "affiliate" })
    }

    if (type === "ad" && ad_id) {
      const { data: ad } = await supabase
        .from("ads")
        .select("clicks")
        .eq("id", ad_id)
        .single()

      if (ad) {
        await supabase
          .from("ads")
          .update({ clicks: (ad.clicks || 0) + 1 })
          .eq("id", ad_id)
      }

      if (campaign_id) {
        const { data: campaign } = await supabase
          .from("ad_campaigns")
          .select("clicks")
          .eq("id", campaign_id)
          .single()

        if (campaign) {
          await supabase
            .from("ad_campaigns")
            .update({ clicks: (campaign.clicks || 0) + 1 })
            .eq("id", campaign_id)
        }
      }

      return NextResponse.json({ success: true, type: "ad" })
    }

    return NextResponse.json({ error: "Invalid request: missing type or id" }, { status: 400 })
  } catch (error: any) {
    console.error("Click tracking error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
