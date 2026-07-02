import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  const offset = (page - 1) * limit

  const { data, count, error } = await supabase
    .from("redirects")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ redirects: data, total: count, page, limit })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const body = await req.json()
  const { from_path, to_path, status_code = 301 } = body

  if (!from_path || !to_path) {
    return NextResponse.json({ error: "from_path and to_path are required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("redirects")
    .insert({ from_path, to_path, status_code })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ redirect: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const { error } = await supabase.from("redirects").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
