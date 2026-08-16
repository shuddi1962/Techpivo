import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { isCronAuthorized } from "@/lib/cron-auth"

export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function GET(request: Request) {
  try {
    if (!(await isCronAuthorized(request, { required: true }))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Kill switch: disabled via site_settings.fetch_trending_keywords_enabled
    // (must be exactly true to run — missing/false = disabled).
    const supabase = createClient()
    const { data: setting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "fetch_trending_keywords_enabled")
      .maybeSingle()
    if (setting?.value !== true) {
      return NextResponse.json({ message: "fetch-trending-keywords is disabled", processed: 0 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const res = await fetch(
      `${supabaseUrl}/functions/v1/fetch-trending-keywords`,
      {
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(120000),
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
