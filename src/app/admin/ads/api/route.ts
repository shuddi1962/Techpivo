import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const section = searchParams.get("section") || "overview"
  const supabase = createClient()

  try {
    switch (section) {
      case "placements": {
        const { data: placements } = await supabase
          .from("ad_placements")
          .select("*")
          .order("created_at", { ascending: false })
        return NextResponse.json({ placements: placements || [] })
      }

      case "campaigns": {
        const { data: campaigns } = await supabase
          .from("ad_campaigns")
          .select("*")
          .order("created_at", { ascending: false })
        return NextResponse.json({ campaigns: campaigns || [] })
      }

      case "schedule": {
        const { data: schedules } = await supabase
          .from("ad_schedules")
          .select("*")
          .order("created_at", { ascending: false })
        return NextResponse.json({ schedules: schedules || [] })
      }

      case "revenue": {
        const { data: revenue } = await supabase
          .from("ad_revenue")
          .select("*")
          .order("date", { ascending: false })
          .limit(100)
        return NextResponse.json({ revenue: revenue || [] })
      }

      case "reports": {
        const { data: revenue } = await supabase
          .from("ad_revenue")
          .select("date, source, impressions, clicks, revenue")
          .order("date", { ascending: false })
          .limit(365)

        const dailyMap: Record<string, { impressions: number; clicks: number; revenue: number; source: string }> = {}
        for (const r of revenue || []) {
          const day = r.date
          const key = `${day}-${r.source}`
          if (!dailyMap[key]) dailyMap[key] = { impressions: 0, clicks: 0, revenue: 0, source: r.source }
          dailyMap[key].impressions += r.impressions || 0
          dailyMap[key].clicks += r.clicks || 0
          dailyMap[key].revenue += r.revenue || 0
        }

        const reports = Object.entries(dailyMap)
          .map(([key, d]) => ({ date: key.split("-").slice(0, 3).join("-"), ...d }))
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 60)

        return NextResponse.json({ reports })
      }

      default: {
        const { count: totalPlacements } = await supabase
          .from("ad_placements")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)

        const { count: totalCampaigns } = await supabase
          .from("ad_campaigns")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)

        const { data: allRevenue } = await supabase
          .from("ad_revenue")
          .select("impressions, clicks, revenue, source")

        const totalImpressions = allRevenue?.reduce((sum, r) => sum + (r.impressions || 0), 0) || 0
        const totalClicks = allRevenue?.reduce((sum, r) => sum + (r.clicks || 0), 0) || 0
        const totalRevenue = allRevenue?.reduce((sum, r) => sum + (r.revenue || 0), 0) || 0

        const sourceMap: Record<string, { revenue: number; impressions: number }> = {}
        for (const r of allRevenue || []) {
          const src = r.source || "unknown"
          if (!sourceMap[src]) sourceMap[src] = { revenue: 0, impressions: 0 }
          sourceMap[src].revenue += r.revenue || 0
          sourceMap[src].impressions += r.impressions || 0
        }
        const topSources = Object.entries(sourceMap)
          .map(([source, d]) => ({ source, ...d }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)

        return NextResponse.json({
          overview: {
            total_impressions: totalImpressions,
            total_clicks: totalClicks,
            total_revenue: totalRevenue,
            fill_rate: totalPlacements && totalPlacements > 0 ? Math.min(100, (totalCampaigns || 0) / totalPlacements * 100) : 0,
            active_placements: totalPlacements || 0,
            active_campaigns: totalCampaigns || 0,
            avg_ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
            top_sources: topSources,
          },
        })
      }
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = createClient()
  const body = await request.json()
  const { type } = body

  try {
    if (type === "placement") {
      const { data, error } = await supabase
        .from("ad_placements")
        .insert({
          name: body.name,
          position: body.position,
          description: body.description || "",
          ad_type: body.ad_type || "banner",
          sizes: body.sizes || ["300x250"],
        })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ placement: data })
    }

    if (type === "campaign") {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .insert({
          advertiser_name: body.advertiser_name,
          ad_image_url: body.ad_image_url || null,
          destination_url: body.destination_url || null,
          ad_code: body.ad_code || null,
          positions: body.positions || [],
          start_date: body.start_date || null,
          end_date: body.end_date || null,
          daily_impression_cap: body.daily_impression_cap || null,
          is_active: body.is_active !== false,
        })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ campaign: data })
    }

    if (type === "schedule") {
      const { data, error } = await supabase
        .from("ad_schedules")
        .insert({
          name: body.name,
          ad_id: body.ad_id || null,
          campaign_id: body.campaign_id || null,
          start_date: body.start_date,
          end_date: body.end_date || null,
          frequency: body.frequency || "always",
          priority: body.priority || 0,
        })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ schedule: data })
    }

    if (type === "revenue") {
      const { data, error } = await supabase
        .from("ad_revenue")
        .insert({
          ad_id: body.ad_id || null,
          campaign_id: body.campaign_id || null,
          source: body.source || "direct",
          impressions: body.impressions || 0,
          clicks: body.clicks || 0,
          revenue: body.revenue || 0,
          cpm: body.cpm || 0,
          cpc: body.cpc || 0,
          date: body.date || new Date().toISOString().slice(0, 10),
        })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ entry: data })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const supabase = createClient()
  const body = await request.json()
  const { type, id, ...updates } = body

  try {
    if (type === "placement") {
      const { data, error } = await supabase
        .from("ad_placements")
        .update({
          name: updates.name,
          position: updates.position,
          description: updates.description,
          ad_type: updates.ad_type,
          sizes: updates.sizes,
          is_active: updates.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ placement: data })
    }

    if (type === "campaign") {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .update({
          advertiser_name: updates.advertiser_name,
          ad_image_url: updates.ad_image_url,
          destination_url: updates.destination_url,
          ad_code: updates.ad_code,
          positions: updates.positions,
          start_date: updates.start_date,
          end_date: updates.end_date,
          daily_impression_cap: updates.daily_impression_cap,
          is_active: updates.is_active,
        })
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ campaign: data })
    }

    if (type === "schedule") {
      const { data, error } = await supabase
        .from("ad_schedules")
        .update({
          name: updates.name,
          ad_id: updates.ad_id || null,
          campaign_id: updates.campaign_id || null,
          start_date: updates.start_date,
          end_date: updates.end_date,
          frequency: updates.frequency,
          priority: updates.priority,
          is_active: updates.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ schedule: data })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  const body = await request.json()
  const { type, id } = body

  try {
    if (type === "placement") {
      const { error } = await supabase.from("ad_placements").delete().eq("id", id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (type === "campaign") {
      const { error } = await supabase.from("ad_campaigns").delete().eq("id", id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (type === "schedule") {
      const { error } = await supabase.from("ad_schedules").delete().eq("id", id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 })
  }
}
