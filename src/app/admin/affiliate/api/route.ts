import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const section = searchParams.get("section") || "overview"
  const supabase = createClient()

  try {
    switch (section) {
      case "links": {
        const { data: links } = await supabase
          .from("affiliate_links")
          .select("*, affiliate_products(product_name), affiliate_programs(program_name)")
          .order("created_at", { ascending: false })
        const formatted = (links || []).map((l: any) => ({
          ...l,
          product_name: l.affiliate_products?.product_name || null,
          program_name: l.affiliate_programs?.program_name || null,
          affiliate_products: undefined,
          affiliate_programs: undefined,
        }))
        return NextResponse.json({ links: formatted })
      }

      case "products": {
        const { data: products } = await supabase
          .from("affiliate_products")
          .select("*")
          .order("created_at", { ascending: false })
        return NextResponse.json({ products: products || [] })
      }

      case "rules": {
        const { data: rules } = await supabase
          .from("affiliate_rules")
          .select("*")
          .order("priority", { ascending: false })
        return NextResponse.json({ rules: rules || [] })
      }

      case "campaigns": {
        const { data: campaigns } = await supabase
          .from("affiliate_campaigns")
          .select("*")
          .order("created_at", { ascending: false })
        return NextResponse.json({ campaigns: campaigns || [] })
      }

      case "revenue": {
        const { data: revenue } = await supabase
          .from("affiliate_sales")
          .select("*")
          .order("recorded_at", { ascending: false })
          .limit(100)
        return NextResponse.json({ revenue: revenue || [] })
      }

      case "reports": {
        const { data: sales } = await supabase
          .from("affiliate_sales")
          .select("amount, commission, recorded_at")
          .order("recorded_at", { ascending: false })
          .limit(365)

        const { data: clicks } = await supabase
          .from("affiliate_clicks")
          .select("clicked_at, converted, conversion_amount")
          .order("clicked_at", { ascending: false })
          .limit(1000)

        const dailyMap: Record<string, { clicks: number; conversions: number; revenue: number }> = {}
        for (const c of clicks || []) {
          const day = new Date(c.clicked_at).toISOString().slice(0, 10)
          if (!dailyMap[day]) dailyMap[day] = { clicks: 0, conversions: 0, revenue: 0 }
          dailyMap[day].clicks++
          if (c.converted) {
            dailyMap[day].conversions++
            dailyMap[day].revenue += c.conversion_amount || 0
          }
        }
        for (const s of sales || []) {
          const day = new Date(s.recorded_at).toISOString().slice(0, 10)
          if (!dailyMap[day]) dailyMap[day] = { clicks: 0, conversions: 0, revenue: 0 }
          dailyMap[day].revenue += s.commission || 0
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

        const { data: allClicks } = await supabase
          .from("affiliate_clicks")
          .select("id, converted, conversion_amount")
        const totalClicks = allClicks?.length || 0
        const totalConversions = allClicks?.filter(c => c.converted).length || 0
        const totalRevenue = allClicks?.reduce((sum, c) => sum + (c.conversion_amount || 0), 0) || 0

        const { count: activeRules } = await supabase
          .from("affiliate_rules")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)

        const { count: activeCampaigns } = await supabase
          .from("affiliate_campaigns")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")

        const { data: programStats } = await supabase
          .from("affiliate_programs")
          .select("id, program_name")
          .eq("is_active", true)

        const programIds = (programStats || []).map(p => p.id)
        const { data: programClicks } = programIds.length > 0 ? await supabase
          .from("affiliate_clicks")
          .select("program_id, converted, conversion_amount")
          .in("program_id", programIds) : { data: [] }

        const clickMap: Record<string, { clicks: number; revenue: number }> = {}
        for (const c of (programClicks || [])) {
          if (!clickMap[c.program_id]) clickMap[c.program_id] = { clicks: 0, revenue: 0 }
          clickMap[c.program_id].clicks++
          if (c.converted) clickMap[c.program_id].revenue += c.conversion_amount || 0
        }

        const topPrograms = (programStats || []).map((p: any) => ({
          name: p.program_name,
          clicks: clickMap[p.id]?.clicks || 0,
          revenue: Math.round((clickMap[p.id]?.revenue || 0) * 100) / 100,
        })).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5)

        return NextResponse.json({
          overview: {
            total_links: totalLinks || 0,
            total_clicks: totalClicks,
            total_conversions: totalConversions,
            total_revenue: totalRevenue,
            conversion_rate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
            active_rules: activeRules || 0,
            active_campaigns: activeCampaigns || 0,
            top_programs: topPrograms,
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
    if (type === "link") {
      const slug = body.custom_slug || `aff-${Date.now().toString(36)}`
      const { data, error } = await supabase
        .from("affiliate_links")
        .insert({
          destination_url: body.destination_url,
          custom_slug: slug,
          product_id: body.product_id || null,
          program_id: body.program_id || null,
        })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ link: data })
    }

    if (type === "rule") {
      const { data, error } = await supabase
        .from("affiliate_rules")
        .insert({
          name: body.name,
          description: body.description || "",
          match_type: body.match_type,
          match_value: body.match_value,
          program_id: body.program_id || null,
          placement: body.placement || "inline",
          priority: body.priority || 0,
          revenue_per_click: body.revenue_per_click || 0,
        })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ rule: data })
    }

    if (type === "campaign") {
      const { data, error } = await supabase
        .from("affiliate_campaigns")
        .insert({
          name: body.name,
          description: body.description || "",
          start_date: body.start_date || null,
          end_date: body.end_date || null,
          budget: body.budget || 0,
          status: body.status || "active",
        })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ campaign: data })
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
    if (type === "link") {
      const { data, error } = await supabase
        .from("affiliate_links")
        .update({
          destination_url: updates.destination_url,
          custom_slug: updates.custom_slug,
          product_id: updates.product_id || null,
          program_id: updates.program_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ link: data })
    }

    if (type === "rule") {
      const { data, error } = await supabase
        .from("affiliate_rules")
        .update({
          name: updates.name,
          description: updates.description,
          match_type: updates.match_type,
          match_value: updates.match_value,
          program_id: updates.program_id || null,
          placement: updates.placement,
          priority: updates.priority,
          revenue_per_click: updates.revenue_per_click,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ rule: data })
    }

    if (type === "campaign") {
      const { data, error } = await supabase
        .from("affiliate_campaigns")
        .update({
          name: updates.name,
          description: updates.description,
          start_date: updates.start_date || null,
          end_date: updates.end_date || null,
          budget: updates.budget,
          status: updates.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ campaign: data })
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
    if (type === "link") {
      const { error } = await supabase.from("affiliate_links").delete().eq("id", id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (type === "rule") {
      const { error } = await supabase.from("affiliate_rules").delete().eq("id", id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (type === "campaign") {
      const { error } = await supabase.from("affiliate_campaigns").delete().eq("id", id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 })
  }
}
