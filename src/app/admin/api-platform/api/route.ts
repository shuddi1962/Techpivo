import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const section = searchParams.get("section") || "overview"

  if (section === "overview") {
    const { data: keys } = await supabase
      .from("api_keys")
      .select("*")

    const allKeys = keys || []
    const activeKeys = allKeys.filter((k: any) => k.is_active)

    return NextResponse.json({
      total_keys: allKeys.length,
      active_keys: activeKeys.length,
      requests_today: activeKeys.reduce((s: number, k: any) => s + (k.request_count || 0), 0),
      requests_this_month: activeKeys.reduce((s: number, k: any) => s + (k.request_count || 0), 0),
      avg_response_time: 0,
      top_endpoints: [],
      rate_limit_status: activeKeys.map((k: any) => ({
        key_name: k.name,
        used: k.request_count || 0,
        limit: k.rate_limit || 1000,
      })),
    })
  }

  if (section === "keys") {
    const { data } = await supabase
      .from("api_keys")
      .select("*")
      .order("created_at", { ascending: false })

    return NextResponse.json({
      keys: (data || []).map((k: any) => ({
        id: k.id,
        name: k.name,
        prefix: k.key_prefix || "",
        scopes: k.permissions || [],
        rate_limit: k.rate_limit || 1000,
        status: k.is_active ? "active" : "revoked",
        created_at: k.created_at,
        last_used_at: k.last_used_at,
        request_count: k.request_count || 0,
      })),
    })
  }

  if (section === "usage") {
    return NextResponse.json({ usage: [] })
  }

  return NextResponse.json({ error: "Invalid section" }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  if (body.action === "create_key") {
    const { data: user } = await supabase.auth.getUser()
    const prefix = "tp_" + Math.random().toString(36).substring(2, 10)
    const keyValue = `tp_live_${Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join("")}`
    const { data, error } = await supabase.from("api_keys").insert({
      name: body.name,
      user_id: user.user?.id,
      key_prefix: prefix,
      key_hash: keyValue,
      permissions: body.scopes || ["read"],
      rate_limit: body.rate_limit || 1000,
      is_active: true,
      request_count: 0,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ api_key: keyValue, key: data })
  }

  if (body.action === "revoke_key") {
    const { error } = await supabase
      .from("api_keys")
      .update({ is_active: false })
      .eq("id", body.key_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
