import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdmin } from "@/lib/supabase/admin"
import { sendBrandedEmail } from "@/lib/email"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const to = String(body?.to || "").trim()
    const templateId = String(body?.template_id || "").trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ error: "Valid recipient email required." }, { status: 400 })
    }
    if (!templateId) {
      return NextResponse.json({ error: "Template id required." }, { status: 400 })
    }

    const supabase = createAdmin()
    const { data: template, error } = await supabase
      .from("marketplace_email_templates")
      .select("name,event_type,subject,html_content")
      .eq("id", templateId)
      .eq("is_active", true)
      .maybeSingle()
    if (error || !template) {
      return NextResponse.json({ error: "Template not found or inactive." }, { status: 404 })
    }

    const result = await sendBrandedEmail({
      to,
      subject: template.subject,
      title: template.name,
      bodyHtml: template.html_content || `<p>Hello,</p><p>This is a ${template.event_type.replace(/_/g, " ")} notification from TechPivo Market.</p>`,
      footerNote: "You are receiving this because you subscribed to TechPivo Market notifications.",
    })

    // Record the send attempt
    try {
      await supabase.from("marketplace_email_logs").insert({
        template_id: templateId,
        recipient_email: to,
        event_type: template.event_type,
        status: result.ok ? "sent" : "failed",
        provider_message_id: result.id || null,
        error: result.error || null,
      })
    } catch {
      // logging is best-effort
    }

    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Send failed." }, { status: 502 })
    }
    return NextResponse.json({ ok: true, id: result.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Send failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
