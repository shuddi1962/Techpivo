import { NextRequest, NextResponse } from "next/server"
import { requireAdminRole } from "@/lib/admin-auth"
import { createClient } from "@/lib/supabase/server"
import { sendNewsletterCampaign } from "@/lib/newsletter"

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response
  const { searchParams } = new URL(request.url)
  const section = searchParams.get("section") || "overview"

  try {
    const supabase = await createClient()

    switch (section) {
      case "subscribers": {
        const { data, error } = await supabase
          .from("subscribers")
          .select("*")
          .order("subscribed_at", { ascending: false })
          .limit(200)
        if (error) throw error
        return NextResponse.json({ subscribers: data || [] })
      }

      case "campaigns": {
        const { data, error } = await supabase
          .from("newsletter_sends")
          .select("*")
          .order("sent_at", { ascending: false })
          .limit(100)
        if (error) throw error
        const campaigns = (data || []).map((s: any) => ({
          id: s.id,
          name: s.subject || "Campaign",
          subject: s.subject || "",
          status: s.sent_at ? "sent" : "draft",
          list_id: null,
          template_id: null,
          sent_at: s.sent_at,
          scheduled_at: null,
          created_at: s.sent_at || new Date().toISOString(),
          open_rate: s.sent_count > 0 ? Math.round((s.open_count / s.sent_count) * 10000) / 100 : null,
          click_rate: s.sent_count > 0 ? Math.round((s.click_count / s.sent_count) * 10000) / 100 : null,
          recipients: s.sent_count || 0,
        }))
        return NextResponse.json({ campaigns })
      }

      case "templates": {
        const { data, error } = await supabase
          .from("newsletter_templates")
          .select("*")
          .order("updated_at", { ascending: false })
        if (error) throw error
        const templates = (data || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          subject: t.subject || "",
          html: t.html_template || t.content || "",
          created_at: t.created_at,
          updated_at: t.updated_at || t.created_at,
        }))
        return NextResponse.json({ templates })
      }

      case "lists": {
        const { data, error } = await supabase
          .from("newsletter_lists")
          .select("*")
          .order("created_at", { ascending: false })
        if (error) throw error
        const lists = (data || []).map((l: any) => ({
          id: l.id,
          name: l.name,
          description: l.description,
          subscriber_count: l.subscriber_count || 0,
          created_at: l.created_at,
        }))
        return NextResponse.json({ lists })
      }

      case "automations": {
        const { data, error } = await supabase
          .from("newsletter_automations")
          .select("*")
          .order("created_at", { ascending: false })
        if (error) throw error
        const automations = (data || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          trigger: a.trigger_type || "new_subscriber",
          action: Array.isArray(a.workflow) && a.workflow.length
            ? a.workflow.map((s: any) => (typeof s === "string" ? s : s.type || "send_email")).join(" → ")
            : "send_email",
          status: a.status || "active",
          runs: a.total_triggered || 0,
          created_at: a.created_at,
        }))
        return NextResponse.json({ automations })
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
          .from("subscribers")
          .select("subscribed_at")
          .order("subscribed_at", { ascending: true })

        const monthMap: Record<string, number> = {}
        ;(subsGrowth || []).forEach((s: any) => {
          const d = new Date(s.subscribed_at)
          const key = d.toLocaleString("default", { month: "short", year: "numeric" })
          monthMap[key] = (monthMap[key] || 0) + 1
        })
        const subscriberGrowth = Object.entries(monthMap).slice(-12).map(([month, count]) => ({ month, count }))

        const { data: campData } = await supabase
          .from("newsletter_sends")
          .select("*")
          .order("sent_at", { ascending: false })
          .limit(50)

        const campaignPerformance = (campData || []).map((c: any) => ({
          name: c.subject || "Campaign",
          opens: c.open_count || 0,
          clicks: c.click_count || 0,
          sent: c.sent_count || 0,
        }))

        const allSends = (campData || []).filter((s: any) => s.sent_at).reverse()

        const openRateHistory = allSends.map((s: any) => ({
          date: s.sent_at ? new Date(s.sent_at).toISOString().slice(0, 10) : "",
          rate: s.sent_count > 0 ? Math.round((s.open_count / s.sent_count) * 10000) / 100 : 0,
        }))

        const clickRateHistory = allSends.map((s: any) => ({
          date: s.sent_at ? new Date(s.sent_at).toISOString().slice(0, 10) : "",
          rate: s.sent_count > 0 ? Math.round((s.click_count / s.sent_count) * 10000) / 100 : 0,
        }))

        const topCampaigns = (campData || [])
          .sort((a: any, b: any) => {
            const aRate = a.sent_count > 0 ? a.open_count / a.sent_count : 0
            const bRate = b.sent_count > 0 ? b.open_count / b.sent_count : 0
            return bRate - aRate
          })
          .slice(0, 5)
          .map((c: any) => ({
            name: c.subject || "Campaign",
            openRate: c.sent_count > 0 ? Math.round((c.open_count / c.sent_count) * 10000) / 100 : 0,
            clickRate: c.sent_count > 0 ? Math.round((c.click_count / c.sent_count) * 10000) / 100 : 0,
          }))

        return NextResponse.json({
          analytics: { subscriberGrowth, campaignPerformance, openRateHistory, clickRateHistory, topCampaigns },
        })
      }

      default: {
        const [totalRes, activeRes] = await Promise.all([
          supabase.from("subscribers").select("*", { count: "exact", head: true }),
          supabase.from("subscribers").select("*", { count: "exact", head: true }).eq("status", "active"),
        ])

        const { count: totalCampaigns } = await supabase
          .from("newsletter_sends")
          .select("*", { count: "exact", head: true })

        const { count: sentCampaigns } = await supabase
          .from("newsletter_sends")
          .select("*", { count: "exact", head: true })
          .not("sent_at", "is", null)

        const { data: recentSubs } = await supabase
          .from("subscribers")
          .select("email, subscribed_at")
          .order("subscribed_at", { ascending: false })
          .limit(3)

        const { data: recentCampaigns } = await supabase
          .from("newsletter_sends")
          .select("subject, sent_at")
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
              message: `Campaign "${c.subject}" was sent`,
              time: new Date(c.sent_at).toLocaleDateString(),
            })
          }
        })
        recentActivity.sort((a, b) => b.time.localeCompare(a.time))

        const { data: allSends } = await supabase
          .from("newsletter_sends")
          .select("open_count, click_count, sent_count")

        const totalSent = (allSends || []).reduce((sum: number, s: any) => sum + (s.sent_count || 0), 0)
        const totalOpens = (allSends || []).reduce((sum: number, s: any) => sum + (s.open_count || 0), 0)
        const totalClicks = (allSends || []).reduce((sum: number, s: any) => sum + (s.click_count || 0), 0)
        const avgOpenRate = totalSent > 0 ? Math.round((totalOpens / totalSent) * 10000) / 100 : 0
        const avgClickRate = totalSent > 0 ? Math.round((totalClicks / totalSent) * 10000) / 100 : 0

        const { data: subsGrowth } = await supabase
          .from("subscribers")
          .select("subscribed_at")
          .order("subscribed_at", { ascending: true })

        const monthMap: Record<string, number> = {}
        ;(subsGrowth || []).forEach((s: any) => {
          const d = new Date(s.subscribed_at)
          const key = d.toLocaleString("default", { month: "short", year: "numeric" })
          monthMap[key] = (monthMap[key] || 0) + 1
        })
        const subscriberGrowth = Object.entries(monthMap).slice(-12).map(([month, count]) => ({ month, count }))

        return NextResponse.json({
          totalSubscribers: totalRes.count || 0,
          activeSubscribers: activeRes.count || 0,
          totalCampaigns: totalCampaigns || 0,
          sentCampaigns: sentCampaigns || 0,
          avgOpenRate,
          avgClickRate,
          recentActivity,
          subscriberGrowth,
        })
      }
    }
  } catch (error) {
    console.error("Newsletter API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    const supabase = await createClient()

    switch (body.action) {
      case "create-campaign": {
        const { data, error } = await supabase
          .from("newsletter_sends")
          .insert({
            subject: body.subject,
            html_content: body.html_content || null,
            sent_count: 0,
            open_count: 0,
            click_count: 0,
          })
          .select()
          .single()
        if (error) throw error
        return NextResponse.json({ campaign: { ...data, name: data.subject } })
      }

      case "send-campaign": {
        const { data: campaign, error: fetchErr } = await supabase
          .from("newsletter_sends")
          .select("*")
          .eq("id", body.id)
          .single()
        if (fetchErr) throw fetchErr

        if (!process.env.RESEND_API_KEY) {
          return NextResponse.json(
            { error: "RESEND_API_KEY not configured — set it in environment variables before sending." },
            { status: 500 }
          )
        }

        const { data: subscribers } = await supabase
          .from("subscribers")
          .select("email")
          .eq("status", "active")

        const emails = (subscribers || []).map((s: any) => s.email)
        if (!emails.length) {
          return NextResponse.json({ error: "No active subscribers to send to" }, { status: 400 })
        }

        const bodyHtml =
          campaign.html_content ||
          `<p style="margin:0;">New update from Techpivo — check out the latest articles, tutorials, and tech news on our site.</p>`

        const delivery = await sendNewsletterCampaign({
          subject: campaign.subject || "Techpivo Newsletter",
          bodyHtml,
          subscribers: emails,
          cta: { label: "Visit Techpivo", url: process.env.NEXT_PUBLIC_SITE_URL || "https://techpivo.com" },
          unsubscribeUrl: (email: string) =>
            `${process.env.NEXT_PUBLIC_SITE_URL || "https://techpivo.com"}/unsubscribe?email=${encodeURIComponent(email)}`,
        })

        if (delivery.error) throw new Error(delivery.error)

        const { error } = await supabase
          .from("newsletter_sends")
          .update({
            sent_at: new Date().toISOString(),
            sent_count: delivery.delivered,
          })
          .eq("id", body.id)
        if (error) throw error

        return NextResponse.json({
          success: true,
          recipients: delivery.delivered,
          total: delivery.total,
          failed: delivery.failed,
        })
      }

      case "create-template": {
        if (!body.name) return NextResponse.json({ error: "Name is required" }, { status: 400 })
        const { data, error } = await supabase
          .from("newsletter_templates")
          .insert({
            name: body.name,
            subject: body.subject || "",
            html_template: body.content || "",
            category: body.category || "general",
          })
          .select()
          .single()
        if (error) throw error
        return NextResponse.json({ template: data })
      }

      case "create-list": {
        if (!body.name) return NextResponse.json({ error: "Name is required" }, { status: 400 })
        const slug = String(body.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
        const { data, error } = await supabase
          .from("newsletter_lists")
          .insert({ name: body.name, slug, description: body.description || null })
          .select()
          .single()
        if (error) throw error
        return NextResponse.json({ list: data })
      }

      case "create-automation": {
        if (!body.name) return NextResponse.json({ error: "Name is required" }, { status: 400 })
        const { data, error } = await supabase
          .from("newsletter_automations")
          .insert({
            name: body.name,
            trigger_type: body.trigger || "new_subscriber",
            workflow: body.workflow || [{ type: "send_email" }],
            status: "active",
          })
          .select()
          .single()
        if (error) throw error
        return NextResponse.json({ automation: data })
      }

      case "create-abtest": {
        if (!body.name) return NextResponse.json({ error: "Name is required" }, { status: 400 })
        const { data, error } = await supabase
          .from("newsletter_ab_tests")
          .insert({
            name: body.name,
            variant_a_subject: body.variantA || "",
            variant_b_subject: body.variantB || "",
            status: "draft",
          })
          .select()
          .single()
        if (error) throw error
        return NextResponse.json({ abTest: data })
      }

      case "bulk-import-subscribers": {
        const emails = (body.emails || []).filter((e: string) => typeof e === "string" && e.includes("@"))
        if (!emails.length) return NextResponse.json({ error: "No valid emails found in file" }, { status: 400 })
        const rows = emails.map((email: string) => ({
          email: email.trim().toLowerCase(),
          status: "active",
          subscribed_at: new Date().toISOString(),
        }))
        const { data, error } = await supabase
          .from("subscribers")
          .upsert(rows, { onConflict: "email" })
          .select()
        if (error) throw error
        return NextResponse.json({ imported: data?.length || 0 })
      }

      case "delete-subscriber": {
        if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 })
        const { error } = await supabase.from("subscribers").delete().eq("id", body.id)
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      case "subscribe":
      case "create-subscriber": {
        if (!body.email) return NextResponse.json({ error: "Email is required" }, { status: 400 })
        const { data, error } = await supabase
          .from("subscribers")
          .upsert(
            { email: body.email, name: body.name || null, status: "active", subscribed_at: new Date().toISOString() },
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

export async function PUT(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    const supabase = await createClient()

    const updates: Record<string, any> = {}
    if (body.name) updates.subject = body.name
    if (body.subject) updates.subject = body.subject

    const { data, error } = await supabase
      .from("newsletter_sends")
      .update(updates)
      .eq("id", body.id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ campaign: { ...data, name: data.subject } })
  } catch (error) {
    console.error("Newsletter PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response
  try {
    const { searchParams } = new URL(request.url)
    let id = searchParams.get("id")
    let type = searchParams.get("type") || "campaign"
    if (!id || !type) {
      const body = await request.json().catch(() => ({}))
      id = id || body.id
      type = type || body.type || "campaign"
    }
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

    const TABLE_MAP: Record<string, string> = {
      campaign: "newsletter_sends",
      template: "newsletter_templates",
      list: "newsletter_lists",
      automation: "newsletter_automations",
      abtest: "newsletter_ab_tests",
    }
    const table = TABLE_MAP[type]
    if (!table) return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 })

    const supabase = await createClient()
    const { error } = await supabase.from(table as any).delete().eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Newsletter DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
