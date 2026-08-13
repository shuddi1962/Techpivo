import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { requireAdminRole, createServiceClient } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response

  try {
    const supabase = createClient()
    const service = createServiceClient()

    const { data: authUsers, error } = await supabase.auth.admin.listUsers({ perPage: 1000, page: 1 })
    if (error) throw error

    const ids = (authUsers.users || []).map((u) => u.id)
    const { data: roles } = await service.from("profiles").select("id, role").in("id", ids)

    const roleMap: Record<string, string> = {}
    ;(roles || []).forEach((p: any) => { roleMap[p.id] = p.role })

    const sessions = (authUsers.users || []).map((u) => ({
      id: u.id,
      email: u.email || u.id,
      role: roleMap[u.id] || "—",
      lastSignIn: u.last_sign_in_at || u.created_at || null,
      createdAt: u.created_at || null,
    }))

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("Auth users API error:", error)
    return NextResponse.json({ error: "Failed to fetch auth users" }, { status: 500 })
  }
}
