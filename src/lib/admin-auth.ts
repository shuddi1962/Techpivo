import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export type AdminResult =
  | { ok: true; user: { id: string; email?: string }; role: string }
  | { ok: false; response: NextResponse }

export async function requireAdminRole(roles: string[] = ["admin", "editor"]): Promise<AdminResult> {
  const sessionClient = await createClient()
  const { data: authData, error: authErr } = await sessionClient.auth.getUser()
  if (authErr || !authData?.user) {
    return { ok: false, response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) }
  }
  const { data: profile } = await sessionClient
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single()
  if (!profile || !roles.includes(profile.role)) {
    return { ok: false, response: NextResponse.json({ error: "Admin access required" }, { status: 403 }) }
  }
  return { ok: true, user: authData.user, role: profile.role }
}

export function createServiceClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
