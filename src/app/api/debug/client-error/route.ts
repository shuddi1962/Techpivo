import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  const url = typeof (body as any)?.url === "string" ? (body as any).url : null
  const errorMessage = typeof (body as any)?.error_message === "string" ? (body as any).error_message : null
  const errorStack = typeof (body as any)?.error_stack === "string" ? (body as any).error_stack : null
  if (!url || !errorMessage || (url?.length || 0) > 500 || (errorMessage?.length || 0) > 4000 || (errorStack?.length || 0) > 20000) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  try {
    const supabase = createClient()
    await supabase.from("client_error_reports").insert({
      url,
      error_message: errorMessage,
      error_stack: errorStack,
      user_agent: req.headers.get("user-agent") ?? null,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
