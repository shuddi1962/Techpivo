import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const section = searchParams.get("section") || "overview"
  const supabase = await createClient()

  try {
    switch (section) {
      case "links": {
        const { data: links } = await supabase
          .from("affiliate_links")
          .select("*")
          .order("created_at", { ascending: false })
        return NextResponse.json({ links: links || [] })
      }

      case "products": {
        const { data: products } = await supabase
          .from("affiliate_products")
          .select("*")
          .order("created_at", { ascending: false })
        return NextResponse.json({ products: products || [] })
      }

      case "rules":
        return NextResponse.json({ rules: [] })

      case "campaigns":
        return NextResponse.json({ campaigns: [] })

      case "revenue": {
        const { data: links } = await supabase
          .from("affiliate_links")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100)

        const revenueEntries = (links || []).map((l: any) => ({
          id: l.id,
          source: l.code || "affiliate",
          impressions: l.clicks || 0,
          clicks: l.clicks || 0,
          revenue: l.revenue || 0,
          cpm: (l.clicks || 0) > 0 ? Math.round(((l.revenue || 0) / (l.clicks || 0)) * 1000 * 100) / 100 : 0,
          cpc: (l.clicks || 0) > 0 ? Math.round(((l.revenue || 0) / (l.clicks || 0)) * 100) / 100 : 0,
          date: l.created_at ? new Date(l.created_at).toISOString().slice(0, 10) : "",
        }))

        return NextResponse.json({ revenue: revenueEntries })
      }

      case "reports": {
        const { data: clicks } = await supabase
          .from("affiliate_clicks")
          .select("clicked_at, program")
          .order("clicked_at", { ascending: false })
          .limit(1000)

        const dailyMap: Record<string, { clicks: number; conversions: number; revenue: number }> = {}
        for (const c of clicks || []) {
          const day = new Date(c.clicked_at).toISOString().slice(0, 10)
          if (!dailyMap[day]) dailyMap[day] = { clicks: 0, conversions: 0, revenue: 0 }
          dailyMap[day].clicks++
        }

        const { data: linkRevenue } = await supabase
          .from("affiliate_links")
          .select("revenue, created_at")

        for (const l of linkRevenue || []) {
          if (l.created_at && l.revenue) {
            const day = new Date(l.created_at).toISOString().slice(0, 10)
            if (!dailyMap[day]) dailyMap[day] = { clicks: 0, conversions: 0, revenue: 0 }
            dailyMap[day].revenue += Number(l.revenue)
          }
        }

        const reports = Object.entries(dailyMap)
          .map(([date, d]) => ({ date, ...d }))
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 60)

        return NextResponse.json({ reports })
      }

      default: {
        const { count: totalLinks } = await supabase
          .from("affiliate_links")
          .select("*", { count: "exact", head: true })

        const { data: allLinks } = await supabase
          .from("affiliate_links")
          .select("clicks, conversions, revenue")

        const totalClicks = (allLinks || []).reduce((sum: number, l: any) => sum + (l.clicks || 0), 0)
        const totalConversions = (allLinks || []).reduce((sum: number, l: any) => sum + (l.conversions || 0), 0)
        const totalRevenue = (allLinks || []).reduce((sum: number, l: any) => sum + Number(l.revenue || 0), 0)

        const { data: clicksData } = await supabase
          .from("affiliate_clicks")
          .select("program")
          .limit(5000)

        const clickCountByProgram: Record<string, number> = {}
        for (const c of clicksData || []) {
          clickCountByProgram[c.program] = (clickCountByProgram[c.program] || 0) + 1
        }

        const topPrograms = Object.entries(clickCountByProgram)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, clicks]) => ({ name, clicks, revenue: 0 }))

        return NextResponse.json({
          overview: {
            total_links: totalLinks || 0,
            total_clicks: totalClicks,
            total_conversions: totalConversions,
            total_revenue: totalRevenue,
            conversion_rate: totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 10000) / 100 : 0,
            active_rules: 0,
            active_campaigns: 0,
            top_programs: topPrograms,
          },
        })
      }
    }
  } catch (error) {
    console.error("Affiliate API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { type } = body

  try {
    if (type === "link") {
      const { data, error } = await supabase
        .from("affiliate_links")
        .insert({
          code: body.custom_slug || `aff-${Date.now().toString(36)}`,
          commission_rate: body.commission_rate || 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
        })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ link: data })
    }

    if (type === "product") {
      const { data, error } = await supabase
        .from("affiliate_products")
        .insert({
          program_key: body.program_key || null,
          product_name: body.product_name,
          product_description: body.product_description || null,
          product_image_url: body.product_image_url || null,
          affiliate_link: body.affiliate_link || "",
          original_price: body.original_price || null,
          sale_price: body.sale_price || null,
          clicks: 0,
          conversions: 0,
          is_active: true,
        })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ product: data })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { type, id, ...updates } = body

  try {
    if (type === "link") {
      const { data, error } = await supabase
        .from("affiliate_links")
        .update({
          code: updates.custom_slug,
          commission_rate: updates.commission_rate,
        })
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ link: data })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { type, id } = body

  try {
    if (type === "link") {
      const { error } = await supabase.from("affiliate_links").delete().eq("id", id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 })
  }
}
