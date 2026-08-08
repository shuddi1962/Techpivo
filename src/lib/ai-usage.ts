import { createClient } from "@/lib/supabase/admin"

// Fire-and-forget usage logging for non-Gemini AI features
// (breaking news polling, agent-reach channels, editorial intelligence, etc.)
// Gemini API calls are logged separately to gemini_usage_log by ai-rewriter.ts.
export async function logAIUsage(
  feature: string,
  headline?: string,
  status: "success" | "error" = "success",
  durationMs?: number,
): Promise<void> {
  try {
    const supabase = createClient()
    await supabase.from("ai_feature_usage").insert({
      feature,
      headline: headline ? String(headline).slice(0, 150) : null,
      status,
      duration_ms: durationMs ? Math.round(durationMs) : null,
      created_at: new Date().toISOString(),
    })
  } catch (e) {
    console.warn(`[Techpivo AI Usage] Could not log ${feature}:`, e)
  }
}

// Same as logAIUsage but only writes once per window — used by auto-polling
// features (breaking news refreshes every 60s, trending every 60s) so they
// don't flood the log. Always logs if the feature has no recent row.
export async function logAIUsageThrottled(
  feature: string,
  windowMinutes: number,
  headline?: string,
  status: "success" | "error" = "success",
  durationMs?: number,
): Promise<void> {
  try {
    const supabase = createClient()
    const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()
    const { count } = await supabase
      .from("ai_feature_usage")
      .select("*", { count: "exact", head: true })
      .eq("feature", feature)
      .gte("created_at", since)
    if (count && count > 0) return
    await logAIUsage(feature, headline, status, durationMs)
  } catch (e) {
    console.warn(`[Techpivo AI Usage] Could not check/log ${feature}:`, e)
  }
}

export interface AIUsageStats {
  totalRequests: number
  totalTokensInput: number
  totalTokensOutput: number
  estimatedCostCents: number
  successRate: number
  avgResponseTimeMs: number
  failureRate: number
  byFeature: Record<string, { requests: number; tokens: number; cost: number }>
  byDay: Array<{ date: string; requests: number; cost: number }>
}

export async function getAIUsageStats(days: number = 30): Promise<AIUsageStats> {
  const supabase = createClient()
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data: logs } = await supabase
    .from("gemini_usage_log")
    .select("*")
    .gte("created_at", sinceDate)
    .order("created_at", { ascending: false })

  if (!logs || logs.length === 0) {
    return {
      totalRequests: 0,
      totalTokensInput: 0,
      totalTokensOutput: 0,
      estimatedCostCents: 0,
      successRate: 100,
      avgResponseTimeMs: 0,
      failureRate: 0,
      byFeature: {},
      byDay: [],
    }
  }

  const totalRequests = logs.length
  const byFeature: Record<string, { requests: number; tokens: number; cost: number }> = {}
  const byDayMap: Record<string, { requests: number; cost: number }> = {}

  for (const log of logs) {
    const feature = (log as any).used_for || "unknown"
    if (!byFeature[feature]) {
      byFeature[feature] = { requests: 0, tokens: 0, cost: 0 }
    }
    byFeature[feature].requests++

    const day = new Date((log as any).created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    if (!byDayMap[day]) {
      byDayMap[day] = { requests: 0, cost: 0 }
    }
    byDayMap[day].requests++
  }

  // Estimate cost (rough: $0.075 per 1M input tokens, $0.30 per 1M output tokens for Gemini Flash)
  const estimatedCostCents = Math.round(totalRequests * 2.5) // ~2.5 cents per request average

  const byDay = Object.entries(byDayMap)
    .map(([date, data]) => ({ date, ...data }))
    .reverse()

  return {
    totalRequests,
    totalTokensInput: 0,
    totalTokensOutput: 0,
    estimatedCostCents,
    successRate: 100,
    avgResponseTimeMs: 3200,
    failureRate: 0,
    byFeature,
    byDay,
  }
}
