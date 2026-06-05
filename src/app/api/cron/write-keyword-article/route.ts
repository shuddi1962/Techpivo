import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const res = await fetch(
      `${supabaseUrl}/functions/v1/write-keyword-article`,
      {
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(240000),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Edge function error: ${err}` }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
