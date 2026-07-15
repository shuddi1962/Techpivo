import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("audit_logs")
      .select("action, user_email, created_at")
      .order("created_at", { ascending: false })
      .limit(20)
    if (error) throw error
    return NextResponse.json({ activities: data || [] })
  } catch (error) {
    console.error("Users API error:", error)
    return NextResponse.json({ activities: [] })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    switch (body.action) {
      case "invite": {
        if (!body.email) {
          return NextResponse.json({ error: "Email is required" }, { status: 400 })
        }

        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", body.email)
          .single()

        if (existing) {
          return NextResponse.json({ error: "User with this email already exists" }, { status: 409 })
        }

        const { error: inviteErr } = await supabase.from("profiles").insert({
          email: body.email,
          role: body.role || "reporter",
          full_name: body.email.split("@")[0],
          username: body.email.split("@")[0],
          created_at: new Date().toISOString(),
        })

        if (inviteErr) throw inviteErr

        await supabase.from("audit_logs").insert({
          action: "user_invited",
          user_email: body.email,
          details: { role: body.role || "reporter" },
          created_at: new Date().toISOString(),
        })

        return NextResponse.json({ success: true })
      }

      case "update-role": {
        if (!body.user_id || !body.role) {
          return NextResponse.json({ error: "user_id and role are required" }, { status: 400 })
        }
        const { error } = await supabase
          .from("profiles")
          .update({ role: body.role })
          .eq("id", body.user_id)
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Users POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
