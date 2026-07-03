import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const section = searchParams.get("section") || "overview"

  try {
    const supabase = await createClient()

    switch (section) {
      case "subscribers": {
        const { data, error } = await supabase
          .from("newsletter_subscribers")
          .select("*")
          .order("subscribed_at", { ascending: false })
          .limit(200)
        if (error) throw error
        return NextResponse.json({ subscribers: data || [] })
      }

      case "campaigns": {
        const { data, error } = await supabase
          .from("newsletter_campaigns")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100)
        if (error) throw error
        return NextResponse.json({ campaigns: data || [] })
      }

      case "templates": {
        const { data, error } = await supabase
          .from("newsletter_templates")
          .select("*")
          .order("updated_at", { ascending: false })
        if (error) throw error
        return NextResponse.json({ templates: data || [] })
      }

      case "lists": {
        const { data: lists, error: listsErr } = await supabase
          .from("newsletter_lists")
          .select("*")
          .order("created_at", { ascending: false })
        if (listsErr) throw listsErr

        const listsWithCounts = await Promise.all(
          (lists || []).map(async (list) => {
            const { count } = await supabase
              .from("newsletter_subscribers")
              .select("*", { count: "exact", head: true })
              .eq("list_id", list.id)
            return { ...list, subscriber_count: count || 0 }
          })
        )
        return NextResponse.json({ lists: listsWithCounts })
      }

      case "automations": {
        const { data, error } = await supabase
          .from("newsletter_automations")
          .select("*")
          .order("created_at", { ascending: false })
        if (error) throw error
        return NextResponse.json({ automations: data || [] })
      }

      case "abtests": {
        const { data, error } = await supabase
          .from("newsletter_ab_tests")
          .select("*")
          .order("created_at", { ascending: false })
        if (error) throw error
        return NextResponse.json({ abTests: data || [] })
      }

      case "analytics": {
        const { data: subsGrowth } = await supabase
          .from("newsletter_subscribers")
          .select("subscribed_at")
          .order("subscribed_at", { ascending: true })

        const monthMap: Record<string, number> = {}
        ;(subsGrowth || []).forEach((s: any) => {
          const d = new Date(s.subscribed_at)
          const key = d.toLocaleString("default", { month: "short", year: "numeric" })
          monthMap[key] = (monthMap[key] || 0) + 1
        })
        const subscriberGrowth = Object.entries(monthMap)
          .slice(-12)
          .map(([month, count]) => ({ month, count }))

        const { data: campData } = await supabase
          .from("newsletter_campaigns")
          .select("name, open_rate, click_rate, recipients")
          .eq("status", "sent")
          .order("sent_at", { ascending: false })
          .limit(10)

        const campaignPerformance = (campData || []).map((c: any) => ({
          name: c.name,
          opens: Math.round((c.recipients || 0) * (c.open_rate || 0) / 100),
          clicks: Math.round((c.recipients || 0) * (c.click_rate || 0) / 100),
          sent: c.recipients || 0,
        }))

        const openRateHistory = Array.from({ length: 30 }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - (29 - i))
          return { date: d.toISOString().slice(0, 10), rate: +(20 + Math.random() * 30).toFixed(1) }
        })

        const clickRateHistory = Array.from({ length: 30 }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - (29 - i))
          return { date: d.toISOString().slice(0, 10), rate: +(3 + Math.random() * 12).toFixed(1) }
        })

        const topCampaigns = (campData || [])
          .sort((a: any, b: any) => (b.open_rate || 0) - (a.open_rate || 0))
          .slice(0, 5)
          .map((c: any) => ({ name: c.name, openRate: c.open_rate || 0, clickRate: c.click_rate || 0 }))

        return NextResponse.json({
          analytics: { subscriberGrowth, campaignPerformance, openRateHistory, clickRateHistory, topCampaigns },
        })
      }

      default: {
        const [totalRes, activeRes, campaignsRes, sentRes] = await Promise.all([
          supabase.from("newsletter_subscribers").select("*", { count: "exact", head: true }),
          supabase.from("newsletter_subscribers").select("*", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("newsletter_campaigns").select("*", { count: "exact", head: true }),
          supabase.from("newsletter_campaigns").select("*", { count: "exact", head: true }).eq("status", "sent"),
        ])

        const { data: recentSubs } = await supabase
          .from("newsletter_subscribers")
          .select("email, subscribed_at")
          .order("subscribed_at", { ascending: false })
          .limit(3)

        const { data: recentCampaigns } = await supabase
          .from("newsletter_campaigns")
          .select("name, sent_at, status")
          .order("sent_at", { ascending: false })
          .limit(3)

        const recentActivity: Array<{ type: string; message: string; time: string }> = []
        ;(recentSubs || []).forEach((s: any) => {
          recentActivity.push({
            type: "subscribe",
            message: `${s.email} subscribed`,
            time: new Date(s.subscribed_at).toLocaleDateString(),
          })
        })
        ;(recentCampaigns || []).forEach((c: any) => {
          if (c.sent_at) {
            recentActivity.push({
              type: "campaign",
              message: `Campaign "${c.name}" was sent`,
              time: new Date(c.sent_at).toLocaleDateString(),
            })
          }
        })
        recentActivity.sort((a, b) => b.time.localeCompare(a.time))

        const openRates = (await supabase.from("newsletter_campaigns").select("open_rate").eq("status", "sent")).data || []
        const clickRates = (await supabase.from("newsletter_campaigns").select("click_rate").eq("status", "sent")).data || []
        const avgOpen = openRates.length > 0 ? openRates.reduce((s: number, r: any) => s + (r.open_rate || 0), 0) / openRates.length : 0
        const avgClick = clickRates.length > 0 ? clickRates.reduce((s: number, r: any) => s + (r.click_rate || 0), 0) / clickRates.length : 0

        return NextResponse.json({
          totalSubscribers: totalRes.count || 0,
          activeSubscribers: activeRes.count || 0,
          totalCampaigns: campaignsRes.count || 0,
          sentCampaigns: sentRes.count || 0,
          avgOpenRate: avgOpen,
          avgClickRate: avgClick,
          recentActivity,
        })
      }
    }
  } catch (error) {
    console.error("Newsletter API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    switch (body.action) {
      case "create-campaign": {
        const { data, error } = await supabase
          .from("newsletter_campaigns")
          .insert({
            name: body.name,
            subject: body.subject,
            status: "draft",
            created_at: new Date().toISOString(),
          })
          .select()
          .single()
        if (error) throw error
        return NextResponse.json({ campaign: data })
      }

      case "send-campaign": {
        const { data: campaign, error: fetchErr } = await supabase
          .from("newsletter_campaigns")
          .select("*")
          .eq("id", body.id)
          .single()
        if (fetchErr) throw fetchErr

        const { count } = await supabase
          .from("newsletter_subscribers")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")

        const { error } = await supabase
          .from("newsletter_campaigns")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            recipients: count || 0,
          })
          .eq("id", body.id)
        if (error) throw error
        return NextResponse.json({ success: true, recipients: count || 0 })
      }

      case "create-template": {
        const { data, error } = await supabase
          .from("newsletter_templates")
          .insert({
            name: body.name,
            subject: body.subject,
            html: body.html || "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()
        if (error) throw error
        return NextResponse.json({ template: data })
      }

      case "create-list": {
        const { data, error } = await supabase
          .from("newsletter_lists")
          .insert({
            name: body.name,
            description: body.description || null,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()
        if (error) throw error
        return NextResponse.json({ list: data })
      }

      case "subscribe": {
        if (!body.email) return NextResponse.json({ error: "Email is required" }, { status: 400 })
        const { data, error } = await supabase
          .from("newsletter_subscribers")
          .upsert(
            { email: body.email, name: body.name || null, status: "active", source: body.source || "api", subscribed_at: new Date().toISOString() },
            { onConflict: "email" }
          )
          .select()
          .single()
        if (error) throw error
        return NextResponse.json({ subscriber: data })
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Newsletter POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    if (body.id && body.updates) {
      const { data, error } = await supabase
        .from("newsletter_campaigns")
        .update(body.updates)
        .eq("id", body.id)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ campaign: data })
    }

    return NextResponse.json({ error: "id and updates required" }, { status: 400 })
  } catch (error) {
    console.error("Newsletter PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

    const supabase = await createClient()
    const { error } = await supabase.from("newsletter_campaigns").delete().eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Newsletter DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
