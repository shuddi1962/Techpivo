import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export type AdminResult =
  | { ok: true; user: { id: string; email?: string }; role: string }
  | { ok: false; response: NextResponse }

/**
 * Authenticates admin/editor roles. Primary path: server cookie session
 * (createClient). Fallback: `Authorization: Bearer <access_token>` header so
 * admin API calls keep working when the browser's Supabase session is alive
 * but the server cookie has expired.
 */
export async function requireAdminRole(
  roles: string[] = ["admin", "editor"],
  req?: NextRequest
): Promise<AdminResult> {
  let client = await createClient()
  let authData = null
  let authErr: { message: string } | null = null
  ;({ data: authData, error: authErr } = await client.auth.getUser())

  if (authErr || !authData?.user) {
    const headerToken = req?.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || undefined
    if (headerToken) {
      const tokenClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: `Bearer ${headerToken}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        }
      )
      const tokenResult = await tokenClient.auth.getUser()
      if (tokenResult.data?.user) {
        authData = tokenResult.data
        authErr = null
        client = tokenClient
      }
    }
  }

  if (authErr || !authData?.user) {
    return { ok: false, response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) }
  }
  const { data: profile } = await client
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
