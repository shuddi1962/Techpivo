import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { requireAdminRole, createServiceClient } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdminRole()
  if (!auth.ok) return auth.response

  try {
    const service = createServiceClient()
    const { data, error } = await service
      .from("audit_logs")
      .select("action, user_id, entity_type, details, created_at")
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
  const auth = await requireAdminRole()
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const adminSupabase = createClient()
    const service = createServiceClient()

    switch (body.action) {
      case "invite": {
        if (!body.email) {
          return NextResponse.json({ error: "Email is required" }, { status: 400 })
        }

        const { data: existingProfile } = await service
          .from("user_profiles")
          .select("id")
          .eq("username", body.email.split("@")[0])
          .maybeSingle()

        if (existingProfile) {
          return NextResponse.json({ error: "User with this email already exists" }, { status: 409 })
        }

        const { data: newUser, error: createError } = await adminSupabase.auth.admin.inviteUserByEmail(body.email, {
          data: { role: body.role || "reporter", full_name: body.email.split("@")[0] },
        })

        if (createError) throw createError

        if (newUser?.user?.id) {
          const cleanUsername = body.email.split("@")[0]
          const cleanRole = body.role || "reporter"
          await service.from("user_profiles").upsert({
            id: newUser.user.id,
            username: cleanUsername,
            full_name: cleanUsername,
            role: cleanRole,
          })
          await service.from("profiles").upsert({
            id: newUser.user.id,
            username: cleanUsername,
            full_name: cleanUsername,
            role: cleanRole,
            bio: "",
          })
        }

        await service.from("audit_logs").insert({
          user_id: auth.user.id,
          action: "user_invited",
          entity_type: "user",
          details: { email: body.email, role: body.role || "reporter" },
          ip_address: request.headers.get("x-forwarded-for")?.split(",")[0] || null,
        })

        return NextResponse.json({ success: true, message: `Invitation sent to ${body.email}` })
      }

      case "update-role": {
        if (!body.user_id || !body.role) {
          return NextResponse.json({ error: "user_id and role are required" }, { status: 400 })
        }
        const { error: profilesError } = await service
          .from("profiles")
          .update({ role: body.role })
          .eq("id", body.user_id)
        if (profilesError) throw profilesError
        await service.from("user_profiles").update({ role: body.role }).eq("id", body.user_id)

        await service.from("audit_logs").insert({
          user_id: auth.user.id,
          action: "update_role",
          entity_type: "user",
          entity_id: body.user_id,
          details: { role: body.role },
          ip_address: request.headers.get("x-forwarded-for")?.split(",")[0] || null,
        })

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
