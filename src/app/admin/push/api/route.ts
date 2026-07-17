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
          .from("push_subscriptions")
          .select("*")
          .order("subscribed_at", { ascending: false })
          .limit(200)
        if (error) throw error
        return NextResponse.json({ subscribers: data || [] })
      }

      case "notifications": {
        const { data, error } = await supabase
          .from("push_notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100)
        if (error) throw error
        return NextResponse.json({ notifications: data || [] })
      }

      case "analytics": {
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("subscribed_at, device_type, browser, os")

        const monthMap: Record<string, number> = {}
        ;(subs || []).forEach((s: any) => {
          const d = new Date(s.subscribed_at)
          const key = d.toLocaleString("default", { month: "short", year: "numeric" })
          monthMap[key] = (monthMap[key] || 0) + 1
        })
        const subscriberGrowth = Object.entries(monthMap)
          .slice(-12)
          .map(([month, count]) => ({ month, count }))

        const browserMap: Record<string, number> = {}
        ;(subs || []).forEach((s: any) => {
          const b = s.browser || "Unknown"
          browserMap[b] = (browserMap[b] || 0) + 1
        })
        const browserBreakdown = Object.entries(browserMap)
          .map(([browser, count]) => ({ browser, count }))
          .sort((a, b) => b.count - a.count)

        const osMap: Record<string, number> = {}
        ;(subs || []).forEach((s: any) => {
          const o = s.os || "Unknown"
          osMap[o] = (osMap[o] || 0) + 1
        })
        const osBreakdown = Object.entries(osMap)
          .map(([os, count]) => ({ os, count }))
          .sort((a, b) => b.count - a.count)

        const { data: notifData } = await supabase
          .from("push_notifications")
          .select("sent_at, sent_count, open_count, status")
          .eq("status", "sent")

        const deliveryRates = Array.from({ length: 30 }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - (29 - i))
          const dayNotifs = (notifData || []).filter((n: any) => n.sent_at?.startsWith(d.toISOString().slice(0, 10)))
          const totalSent = dayNotifs.reduce((sum: number, n: any) => sum + (n.sent_count || 0), 0)
          const totalOpens = dayNotifs.reduce((sum: number, n: any) => sum + (n.open_count || 0), 0)
          const rate = totalSent > 0 ? +(totalOpens / totalSent * 100).toFixed(1) : 0
          return { date: d.toISOString().slice(0, 10), rate }
        })

        const clickRates = Array.from({ length: 30 }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - (29 - i))
          return { date: d.toISOString().slice(0, 10), rate: 0 }
        })

        return NextResponse.json({
          analytics: { deliveryRates, clickRates, subscriberGrowth, browserBreakdown, osBreakdown },
        })
      }

      default: {
        const [totalRes, activeRes, sentRes] = await Promise.all([
          supabase.from("push_subscriptions").select("*", { count: "exact", head: true }),
          supabase.from("push_subscriptions").select("*", { count: "exact", head: true }).gte("last_seen_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
          supabase.from("push_notifications").select("*", { count: "exact", head: true }).eq("status", "sent"),
        ])

        const { data: notifs } = await supabase
          .from("push_notifications")
          .select("sent_count, open_count")

        const totalSent = (notifs || []).reduce((s: number, n: any) => s + (n.sent_count || 0), 0)
        const totalOpens = (notifs || []).reduce((s: number, n: any) => s + (n.open_count || 0), 0)
        const avgOpenRate = totalSent > 0 ? (totalOpens / totalSent) * 100 : 0

        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("device_type")

        const deviceMap: Record<string, number> = {}
        ;(subs || []).forEach((s: any) => {
          const t = s.device_type || "desktop"
          deviceMap[t] = (deviceMap[t] || 0) + 1
        })
        const deviceBreakdown = Object.entries(deviceMap).map(([type, count]) => ({ type, count }))

        const { data: recentNotifs } = await supabase
          .from("push_notifications")
          .select("title, sent_at, open_count")
          .eq("status", "sent")
          .order("sent_at", { ascending: false })
          .limit(5)

        return NextResponse.json({
          totalSubscribers: totalRes.count || 0,
          activeSubscribers: activeRes.count || 0,
          totalSent: sentRes.count || 0,
          totalOpens,
          avgOpenRate,
          deviceBreakdown,
          recentNotifications: (recentNotifs || []).map((n: any) => ({
            title: n.title,
            sent_at: n.sent_at,
            opens: n.open_count || 0,
          })),
        })
      }
    }
  } catch (error) {
    console.error("Push API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    switch (body.action) {
      case "create-notification": {
        if (!body.title || !body.body) {
          return NextResponse.json({ error: "Title and body are required" }, { status: 400 })
        }
        const { data, error } = await supabase
          .from("push_notifications")
          .insert({
            title: body.title,
            body: body.body,
            url: body.url || null,
            image: body.image || null,
            audience: body.audience || "all",
            status: "draft",
            created_at: new Date().toISOString(),
          })
          .select()
          .single()
        if (error) throw error
        return NextResponse.json({ notification: data })
      }

      case "send-notification": {
        let notificationId = body.id
        let title = body.title
        let bodyText = body.body
        let url = body.url || null
        let image = body.image || null
        let audience = body.audience || "all"

        if (!notificationId && title && bodyText) {
          const { data: created, error: createErr } = await supabase
            .from("push_notifications")
            .insert({
              title,
              body: bodyText,
              url,
              image,
              audience,
              status: "draft",
              created_at: new Date().toISOString(),
            })
            .select()
            .single()
          if (createErr) throw createErr
          notificationId = created.id
        }

        if (!notificationId) {
          return NextResponse.json({ error: "Notification ID or title/body required" }, { status: 400 })
        }

        let query = supabase.from("push_subscriptions").select("endpoint, p256dh, auth")
        if (audience !== "all") {
          if (["desktop", "mobile", "tablet"].includes(audience)) {
            query = query.eq("device_type", audience)
          } else {
            query = query.eq("browser", audience)
          }
        }
        const { data: subs } = await query
        const sentCount = (subs || []).length

        const { error } = await supabase
          .from("push_notifications")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            sent_count: sentCount,
          })
          .eq("id", notificationId)
        if (error) throw error

        return NextResponse.json({ success: true, sentCount, notificationId })
      }

      case "register-subscriber": {
        if (!body.endpoint || !body.p256dh || !body.auth) {
          return NextResponse.json({ error: "endpoint, p256dh, and auth are required" }, { status: 400 })
        }
        const { data, error } = await supabase
          .from("push_subscriptions")
          .upsert(
            {
              endpoint: body.endpoint,
              p256dh: body.p256dh,
              auth: body.auth,
              device_type: body.device_type || "desktop",
              browser: body.browser || "Unknown",
              os: body.os || "Unknown",
              user_agent: body.user_agent || null,
              subscribed_at: new Date().toISOString(),
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: "endpoint" }
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
    console.error("Push POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

    const supabase = await createClient()
    const { error } = await supabase.from("push_notifications").delete().eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Push DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
