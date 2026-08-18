import { NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { requireAdminRole } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: Request) {
  const auth = await requireAdminRole(["admin", "editor"], req as any)
  if (!auth.ok) return auth.response
  const { count } = await getSupabase()
    .from("posts")
    .select("id", { count: "exact", head: true })
    .not("quality_score", "is", null)

  const { error } = await getSupabase()
    .from("posts")
    .update({ ai_rewritten: false, quality_score: null, quick_brief: [] })
    .not("quality_score", "is", null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ reset: count || 0 })
}
