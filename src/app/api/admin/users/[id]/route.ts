import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { requireAdminRole, createServiceClient } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRole()
  if (!auth.ok) return auth.response

  const { id } = await params
  const { full_name, role, username } = await request.json()
  const service = createServiceClient()

  const updates: Record<string, any> = {}
  if (typeof full_name === "string") updates.full_name = full_name
  if (typeof username === "string") updates.username = username
  if (typeof role === "string") updates.role = role

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  const { error: profilesError } = await service.from("profiles").update(updates).eq("id", id)
  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 400 })

  const { error: userProfilesError } = await service.from("user_profiles").update(updates).eq("id", id)
  if (userProfilesError) console.error("user_profiles update error:", userProfilesError)

  await service.from("audit_logs").insert({
    user_id: auth.user.id,
    action: "update_user",
    entity_type: "user",
    entity_id: id,
    details: updates,
    ip_address: request.headers.get("x-forwarded-for")?.split(",")[0] || null,
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRole()
  if (!auth.ok) return auth.response

  const { id } = await params
  const supabase = createClient()
  const service = createServiceClient()

  await service.from("user_profiles").delete().eq("id", id)
  await service.from("profiles").delete().eq("id", id)
  const { error } = await supabase.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await service.from("audit_logs").insert({
    user_id: auth.user.id,
    action: "delete_user",
    entity_type: "user",
    entity_id: id,
    ip_address: _request.headers.get("x-forwarded-for")?.split(",")[0] || null,
  })

  return NextResponse.json({ success: true })
}
