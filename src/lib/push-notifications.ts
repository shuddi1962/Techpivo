import { createClient } from "@/lib/supabase/server"

// ─── Push Subscribers ───

export async function getPushSubscribers(opts?: { active?: boolean; limit?: number }) {
  const supabase = await createClient()
  let q = supabase.from("push_subscribers").select("*", { count: "exact" })
  if (opts?.active !== undefined) q = q.eq("is_active", opts.active)
  q = q.order("created_at", { ascending: false })
  if (opts?.limit) q = q.limit(opts.limit)
  return q
}

export async function registerPushSubscriber(data: {
  user_id?: string; endpoint: string; p256dh: string; auth_key: string;
  device_type?: string; browser?: string; os?: string
}) {
  const supabase = await createClient()
  const { data: existing } = await supabase.from("push_subscribers").select("id").eq("endpoint", data.endpoint).single()
  if (existing) {
    return supabase.from("push_subscribers").update({ is_active: true, updated_at: new Date().toISOString() }).eq("id", existing.id).select().single()
  }
  return supabase.from("push_subscribers").insert(data).select().single()
}

export async function unsubscribePush(endpoint: string) {
  const supabase = await createClient()
  return supabase.from("push_subscribers").update({ is_active: false }).eq("endpoint", endpoint)
}

export async function getPushSubscriberStats() {
  const supabase = await createClient()
  const [total, active] = await Promise.all([
    supabase.from("push_subscribers").select("id", { count: "exact", head: true }),
    supabase.from("push_subscribers").select("id", { count: "exact", head: true }).eq("is_active", true),
  ])
  return { total: total.count || 0, active: active.count || 0 }
}

// ─── Push Notifications ───

export async function getPushNotifications(opts?: { status?: string; limit?: number }) {
  const supabase = await createClient()
  let q = supabase.from("push_notifications").select("*")
  if (opts?.status) q = q.eq("status", opts.status)
  q = q.order("created_at", { ascending: false })
  if (opts?.limit) q = q.limit(opts.limit)
  return q
}

export async function getPushNotification(id: string) {
  const supabase = await createClient()
  return supabase.from("push_notifications").select("*").eq("id", id).single()
}

export async function createPushNotification(data: {
  title: string; body: string; url?: string; image?: string; icon?: string;
  audience?: string; segment_config?: any
}) {
  const supabase = await createClient()
  return supabase.from("push_notifications").insert({
    title: data.title, body: data.body, url: data.url || "",
    image: data.image || "", icon: data.icon || "/icon-192x192.png",
    audience: data.audience || "all", segment_config: data.segment_config || {},
    status: "draft"
  }).select().single()
}

export async function updatePushNotification(id: string, data: Record<string, any>) {
  const supabase = await createClient()
  return supabase.from("push_notifications").update({ ...data, updated_at: new Date().toISOString() }).eq("id", id).select().single()
}

export async function sendPushNotification(id: string) {
  const supabase = await createClient()
  const { data: notification } = await supabase.from("push_notifications").select("*").eq("id", id).single()
  if (!notification) return { error: "Notification not found" }

  let subscribers
  if (notification.audience === "all") {
    const { data } = await supabase.from("push_subscribers").select("id,endpoint,p256dh,auth_key").eq("is_active", true)
    subscribers = data
  } else {
    const { data } = await supabase.from("push_subscribers").select("id,endpoint,p256dh,auth_key").eq("is_active", true)
    subscribers = data
  }

  if (!subscribers || subscribers.length === 0) return { error: "No active subscribers" }

  await supabase.from("push_notifications").update({ status: "sending", total_sent: subscribers.length }).eq("id", id)

  // Create send records
  const sends = subscribers.map((sub: any) => ({
    notification_id: id, subscriber_id: sub.id, status: "sent", sent_at: new Date().toISOString()
  }))

  for (let i = 0; i < sends.length; i += 500) {
    await supabase.from("push_sends").insert(sends.slice(i, i + 500))
  }

  await supabase.from("push_notifications").update({
    status: "sent", sent_at: new Date().toISOString(), total_sent: subscribers.length
  }).eq("id", id)

  // In production: use web-push library to actually deliver
  // const webPush = require('web-push')
  // webPush.setVapidDetails(...)
  // for each subscriber: webPush.sendNotification(...)

  return { data: { sent: subscribers.length } }
}

export async function deletePushNotification(id: string) {
  const supabase = await createClient()
  return supabase.from("push_notifications").delete().eq("id", id)
}

export async function getPushNotificationStats() {
  const supabase = await createClient()
  const [total, sent, draft] = await Promise.all([
    supabase.from("push_notifications").select("id", { count: "exact", head: true }),
    supabase.from("push_notifications").select("id", { count: "exact", head: true }).eq("status", "sent"),
    supabase.from("push_notifications").select("id", { count: "exact", head: true }).eq("status", "draft"),
  ])
  return { total: total.count || 0, sent: sent.count || 0, draft: draft.count || 0 }
}
