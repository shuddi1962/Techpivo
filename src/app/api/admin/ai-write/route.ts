import { NextRequest, NextResponse } from "next/server"
import { manualWriteFromTopic, manualWriteFromUrl } from "@/lib/ai-rewriter"
import { createClient } from "@/lib/supabase/server"

const MONTHLY_MANUAL_CAP = 2000

async function getManualUsageThisMonth(supabase: ReturnType<typeof createClient>): Promise<number> {
  const firstOfMonth = new Date()
  firstOfMonth.setDate(1)
  firstOfMonth.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from("ai_usage_log")
    .select("*", { count: "exact", head: true })
    .eq("type", "manual")
    .gte("created_at", firstOfMonth.toISOString())

  return count || 0
}

async function logManualUsage(
  supabase: ReturnType<typeof createClient>,
  inputType: string,
  inputPreview: string,
  headline: string,
  model: string,
) {
  await supabase.from("ai_usage_log").insert({
    type:          "manual",
    input_type:    inputType,
    input_preview: inputPreview.slice(0, 100),
    headline:      headline.slice(0, 150),
    model,
    created_at:    new Date().toISOString(),
  })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || !["admin", "editor", "author"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { mode, input } = body

    if (!mode || !input) {
      return NextResponse.json({ error: "mode and input are required" }, { status: 400 })
    }
    if (!["topic", "url"].includes(mode)) {
      return NextResponse.json({ error: "mode must be topic or url" }, { status: 400 })
    }
    if (mode === "url" && !input.startsWith("http")) {
      return NextResponse.json({ error: "input must be a valid URL starting with http" }, { status: 400 })
    }

    const usedThisMonth = await getManualUsageThisMonth(supabase)
    if (usedThisMonth >= MONTHLY_MANUAL_CAP) {
      return NextResponse.json({
        error: `Monthly manual AI quota reached (${MONTHLY_MANUAL_CAP} requests/month). Resets on the 1st.`,
        quota: {
          used:      usedThisMonth,
          cap:       MONTHLY_MANUAL_CAP,
          remaining: 0,
          resets:    "First of next month",
        },
      }, { status: 429 })
    }

    const remaining = MONTHLY_MANUAL_CAP - usedThisMonth
    console.log(`[Techpivo Manual AI] ${mode.toUpperCase()} | User: ${user.email} | Quota: ${usedThisMonth}/${MONTHLY_MANUAL_CAP}`)

    const startTime = Date.now()

    const result = mode === "topic"
      ? await manualWriteFromTopic(input)
      : await manualWriteFromUrl(input)

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    if (!result.article) {
      return NextResponse.json({
        error: `AI writing failed. Debug: ${result.debug}. Suggestions: try a more specific topic, check API keys, or check server logs.`,
        debug: result.debug,
      }, { status: 500 })
    }

    await logManualUsage(
      supabase,
      mode,
      input,
      result.article.headline,
      "gemini-2.5-flash",
    )

    return NextResponse.json({
      ok: true,
      article: result.article,
      meta: {
        elapsed_seconds:   elapsed,
        quota_used:        usedThisMonth + 1,
        quota_cap:         MONTHLY_MANUAL_CAP,
        quota_remaining:   remaining - 1,
        quota_resets:      "First of next month",
        model_used:        "Gemini 2.5 Flash + Google Search Grounding",
      },
    })

  } catch (err) {
    console.error("[ai-write route error]", err)
    return NextResponse.json({ error: "Server error", detail: String(err) }, { status: 500 })
  }
}
