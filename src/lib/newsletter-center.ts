import { createClient } from "@/lib/supabase/server"

// ─── Subscribers ───

export async function getSubscribers(opts?: { status?: string; listId?: string; limit?: number; offset?: number }) {
  const supabase = await createClient()
  let q = supabase.from("newsletter_subscribers").select("*", { count: "exact" })
  if (opts?.status) q = q.eq("status", opts.status)
  if (opts?.listId) q = q.contains("lists", [opts.listId])
  q = q.order("created_at", { ascending: false })
  if (opts?.limit) q = q.range(opts.offset || 0, (opts.offset || 0) + opts.limit - 1)
  return q
}

export async function getSubscriberByEmail(email: string) {
  const supabase = await createClient()
  return supabase.from("newsletter_subscribers").select("*").eq("email", email).single()
}

export async function subscribeEmail(email: string, lists: string[] = [], source: string = "manual") {
  const supabase = await createClient()
  const { data: existing } = await supabase.from("newsletter_subscribers").select("id,status").eq("email", email).single()
  if (existing) {
    if (existing.status === "unsubscribed") {
      return supabase.from("newsletter_subscribers").update({ status: "active", unsubscribed_at: null, lists, updated_at: new Date().toISOString() }).eq("id", existing.id).select().single()
    }
    return { data: existing, error: null }
  }
  return supabase.from("newsletter_subscribers").insert({ email, lists, source, status: "active" }).select().single()
}

export async function unsubscribeEmail(email: string) {
  const supabase = await createClient()
  return supabase.from("newsletter_subscribers").update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() }).eq("email", email)
}

export async function getSubscriberStats() {
  const supabase = await createClient()
  const [total, active, unsubscribed, bounced] = await Promise.all([
    supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
    supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "unsubscribed"),
    supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "bounced"),
  ])
  return { total: total.count || 0, active: active.count || 0, unsubscribed: unsubscribed.count || 0, bounced: bounced.count || 0 }
}

// ─── Campaigns ───

export async function getCampaigns(opts?: { status?: string; limit?: number }) {
  const supabase = await createClient()
  let q = supabase.from("newsletter_campaigns").select("*, list:newsletter_lists(name,slug)")
  if (opts?.status) q = q.eq("status", opts.status)
  q = q.order("created_at", { ascending: false })
  if (opts?.limit) q = q.limit(opts.limit)
  return q
}

export async function getCampaign(id: string) {
  const supabase = await createClient()
  return supabase.from("newsletter_campaigns").select("*, list:newsletter_lists(name,slug)").eq("id", id).single()
}

export async function createCampaign(data: {
  name: string; subject: string; preview_text?: string; html_content?: string; plain_content?: string;
  from_name?: string; from_email?: string; reply_to?: string; list_id?: string; template_id?: string
}) {
  const supabase = await createClient()
  return supabase.from("newsletter_campaigns").insert({
    name: data.name, subject: data.subject, preview_text: data.preview_text || "",
    html_content: data.html_content || "", plain_content: data.plain_content || "",
    from_name: data.from_name || "TechPivo", from_email: data.from_email || "newsletter@techpivo.com",
    reply_to: data.reply_to || "hello@techpivo.com", list_id: data.list_id, template_id: data.template_id,
    status: "draft"
  }).select().single()
}

export async function updateCampaign(id: string, data: Record<string, any>) {
  const supabase = await createClient()
  return supabase.from("newsletter_campaigns").update({ ...data, updated_at: new Date().toISOString() }).eq("id", id).select().single()
}

export async function deleteCampaign(id: string) {
  const supabase = await createClient()
  return supabase.from("newsletter_campaigns").delete().eq("id", id)
}

export async function sendCampaign(id: string) {
  const supabase = await createClient()
  const { data: campaign } = await supabase.from("newsletter_campaigns").select("*").eq("id", id).single()
  if (!campaign || campaign.status !== "draft") return { error: "Campaign not ready" }

  let subscribers
  if (campaign.list_id) {
    const { data } = await supabase.from("newsletter_subscribers").select("id,email").eq("status", "active").contains("lists", [campaign.list_id])
    subscribers = data
  } else {
    const { data } = await supabase.from("newsletter_subscribers").select("id,email").eq("status", "active")
    subscribers = data
  }

  if (!subscribers || subscribers.length === 0) return { error: "No active subscribers" }

  await supabase.from("newsletter_campaigns").update({ status: "sending", total_sent: subscribers.length }).eq("id", id)

  const sends = subscribers.map((sub: any) => ({ campaign_id: id, subscriber_id: sub.id, status: "sent", sent_at: new Date().toISOString() }))

  // Batch inserts of 500
  for (let i = 0; i < sends.length; i += 500) {
    await supabase.from("newsletter_sends").insert(sends.slice(i, i + 500))
  }

  await supabase.from("newsletter_campaigns").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", id)

  return { data: { sent: subscribers.length } }
}

export async function getCampaignStats() {
  const supabase = await createClient()
  const [total, sent, draft, scheduled] = await Promise.all([
    supabase.from("newsletter_campaigns").select("id", { count: "exact", head: true }),
    supabase.from("newsletter_campaigns").select("id", { count: "exact", head: true }).eq("status", "sent"),
    supabase.from("newsletter_campaigns").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("newsletter_campaigns").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
  ])
  return { total: total.count || 0, sent: sent.count || 0, draft: draft.count || 0, scheduled: scheduled.count || 0 }
}

// ─── Templates ───

export async function getTemplates() {
  const supabase = await createClient()
  return supabase.from("newsletter_templates").select("*").order("created_at", { ascending: false })
}

export async function createTemplate(data: { name: string; description?: string; category?: string; html_template: string }) {
  const supabase = await createClient()
  return supabase.from("newsletter_templates").insert(data).select().single()
}

// ─── Lists ───

export async function getLists() {
  const supabase = await createClient()
  return supabase.from("newsletter_lists").select("*").order("created_at", { ascending: false })
}

export async function createList(data: { name: string; slug: string; description?: string }) {
  const supabase = await createClient()
  return supabase.from("newsletter_lists").insert(data).select().single()
}

// ─── Activity ───

export async function logActivity(data: { subscriber_id: string; campaign_id?: string; event_type: string; event_data?: any; ip_address?: string; user_agent?: string }) {
  const supabase = await createClient()
  return supabase.from("newsletter_activity").insert(data)
}

export async function getRecentActivity(limit = 50) {
  const supabase = await createClient()
  return supabase.from("newsletter_activity").select("*, subscriber:newsletter_subscribers(email,name), campaign:newsletter_campaigns(name,subject)").order("created_at", { ascending: false }).limit(limit)
}

// ─── Automation ───

export async function getAutomations() {
  const supabase = await createClient()
  return supabase.from("newsletter_automations").select("*").order("created_at", { ascending: false })
}

export async function createAutomation(data: { name: string; description?: string; trigger_type: string; trigger_config?: any; workflow?: any[] }) {
  const supabase = await createClient()
  return supabase.from("newsletter_automations").insert(data).select().single()
}
