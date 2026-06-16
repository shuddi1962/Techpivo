import { NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .not("blizine_score", "is", null)

  const { error } = await supabase
    .from("posts")
    .update({ ai_rewritten: false, blizine_score: null, quick_brief: [] })
    .not("blizine_score", "is", null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ reset: count || 0 })
}
