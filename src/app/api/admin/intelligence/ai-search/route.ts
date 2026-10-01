import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRole } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/admin";
import { checkRateLimit, clientIp } from "@/lib/rate-limiter";
import { fetchAiKeywordVolume, fetchLlmTargetMetrics } from "@/lib/dataforseo";
import { DataForSeoError } from "@/lib/dataforseo/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

/**
 * GET /api/admin/intelligence/ai-search?domain=techpivo.com
 * On-demand LLM brand-visibility snapshot (~$0.10/call — never bulk).
 * Empty totals = no measurable mentions (honest, not an error).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const rl = checkRateLimit(`intel-ai:${clientIp(request)}`, { limit: 10, windowMs: 3600_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "AI-search checks are rate-limited (10/hour) — LLM calls are paid." }, { status: 429 });
  }

  const domain = (new URL(request.url).searchParams.get("domain") ?? "techpivo.com").trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  try {
    const res = await fetchLlmTargetMetrics({ domain });
    const totals = res.data ?? { mentions: 0, aiSearchVolume: 0, byPlatform: [], topSourceDomains: [] };
    return NextResponse.json({
      domain,
      mentions: totals.mentions,
      ai_search_volume: totals.aiSearchVolume,
      by_platform: totals.byPlatform,
      top_source_domains: totals.topSourceDomains,
      cost_usd: res.cost.cost ?? 0,
      endpoint: "ai_optimization/llm_mentions/target_metrics/live",
      measured_at: new Date().toISOString(),
      note: totals.mentions === 0 ? "No measurable LLM mentions for this domain in the current window." : undefined,
    });
  } catch (err) {
    if (err instanceof DataForSeoError) {
      const http = err.status === "not_configured" ? 503 : 502;
      return NextResponse.json({ error: err.message, reason: err.status, retryable: err.retryable }, { status: http });
    }
    return NextResponse.json({ error: "AI-search check failed.", reason: "unknown" }, { status: 500 });
  }
}

const Body = z.object({
  keywords: z.array(z.string().trim().min(2).max(80)).min(1).max(10),
  locationCode: z.number().int().positive().default(2840),
  languageCode: z.string().trim().min(2).max(10).default("en"),
});

/**
 * POST /api/admin/intelligence/ai-search {keywords[], locationCode?}
 * AI-tool demand per keyword (~$0.01). Merges ai_search_volume into the
 * latest stored snapshot metrics so AI demand joins the trend record.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const rl = checkRateLimit(`intel-aivol:${clientIp(request)}`, { limit: 20, windowMs: 3600_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited. Wait and retry." }, { status: 429 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json().catch(() => null));
  } catch {
    return NextResponse.json({ error: "Provide keywords (1-10).", }, { status: 400 });
  }

  try {
    const res = await fetchAiKeywordVolume({ keywords: body.keywords, locationCode: body.locationCode, languageCode: body.languageCode.toLowerCase() });
    const supabase = createClient();
    for (const item of res.data ?? []) {
      const { data: latest } = await supabase
        .from("keyword_snapshots")
        .select("id, metrics")
        .eq("keyword", item.keyword)
        .eq("location_code", body.locationCode)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest) {
        await supabase.from("keyword_snapshots").update({
          metrics: { ...((latest.metrics as object) ?? {}), ai_search_volume: item.aiSearchVolume, ai_monthly: item.aiMonthly, ai_measured_at: new Date().toISOString() },
        }).eq("id", (latest.id as string));
      }
    }
    return NextResponse.json({
      volumes: res.data ?? [], cost_usd: res.cost.cost ?? 0,
      endpoint: "ai_optimization/ai_keyword_data/keywords_search_volume/live",
      measured_at: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof DataForSeoError) {
      const http = err.status === "not_configured" ? 503 : 502;
      return NextResponse.json({ error: err.message, reason: err.status, retryable: err.retryable }, { status: http });
    }
    return NextResponse.json({ error: "AI volume lookup failed.", reason: "unknown" }, { status: 500 });
  }
}
