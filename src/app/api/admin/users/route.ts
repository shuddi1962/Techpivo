import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { requireAdminRole, createServiceClient } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response
  const supabase = createClient()
  const { data: authUsers, error } = await supabase.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const emailMap: Record<string, string> = {}
  for (const u of authUsers.users) {
    emailMap[u.id] = u.email || ""
  }
  return NextResponse.json({ users: emailMap })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response

  const { email, password, fullName, role, username } = await request.json()
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
  }

  const supabase = createClient()
  const service = createServiceClient()

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: role || "contributor" },
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || "Failed to create user" }, { status: 400 })
  }

  const newId = authData.user.id
  const cleanRole = role || "contributor"
  const cleanUsername = username || email.split("@")[0]
  const cleanName = fullName || cleanUsername

  const { error: profileError } = await service.from("profiles").insert({
    id: newId,
    full_name: cleanName,
    username: cleanUsername,
    role: cleanRole,
    bio: "",
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(newId)
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  const { error: userProfileError } = await service.from("user_profiles").insert({
    id: newId,
    username: cleanUsername,
    full_name: cleanName,
    role: cleanRole,
  })
  if (userProfileError) console.error("user_profiles insert error:", userProfileError)

  await service.from("audit_logs").insert({
    user_id: auth.user.id,
    action: "create_user",
    entity_type: "user",
    entity_id: newId,
    details: { email, role: cleanRole },
    ip_address: request.headers.get("x-forwarded-for")?.split(",")[0] || null,
  })

  return NextResponse.json({ success: true, userId: newId })
}
