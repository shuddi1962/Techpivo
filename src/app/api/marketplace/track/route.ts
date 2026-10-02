import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

// Best-effort product view/click counter (powers "most viewed" sorting).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const id = typeof body?.id === "string" ? body.id : ""
    if (!/^[0-9a-f-]{8,64}$/i.test(id)) return NextResponse.json({ ok: false }, { status: 400 })
    const supabase = createClient()
    const { data: row } = await supabase.from("affiliate_products").select("clicks").eq("id", id).maybeSingle()
    const current = Number((row as { clicks?: number } | null)?.clicks ?? 0)
    await supabase.from("affiliate_products").update({ clicks: current + 1 }).eq("id", id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
