import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRole } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/admin";
import { checkRateLimit, clientIp } from "@/lib/rate-limiter";
import { classifyIntent } from "@/lib/keyword-intelligence";
import {
  fetchKeywordOverview,
  normalizeMetric,
  logDataForSeoUsage,
  resolveLocation,
  fetchLiveSerp,
  DFS_DEFAULT_LANGUAGE_CODE,
  DFS_DEFAULT_LOCATION_CODE,
} from "@/lib/dataforseo";
import { DataForSeoError } from "@/lib/dataforseo/errors";
import { checkTechPivoCoverage } from "@/lib/intelligence/coverage";
import { scoreOpportunity } from "@/lib/intelligence/scoring";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const Body = z.object({
  keyword: z.string().trim().min(2).max(80),
  locationCode: z.number().int().positive().optional(),
  languageCode: z.string().trim().min(2).max(10).optional(),
  category: z.string().trim().max(80).optional(),
});

/**
 * POST /api/admin/intelligence/opportunities/analyze
 * Demand → trend → live SERP → TechPivo coverage → explainable score.
 * Persists a keyword snapshot + a content_opportunities row (discovered).
 * Never invents metrics; every number carries source + timestamp.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const rl = checkRateLimit(`dfs-analyze:${clientIp(request)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited. Wait a minute and retry." }, { status: 429 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json().catch(() => null));
  } catch {
    return NextResponse.json({ error: "Provide keyword (2-80 chars), optional locationCode, languageCode, category." }, { status: 400 });
  }

  const keyword = body.keyword.trim();
  const locationCode = body.locationCode ?? DFS_DEFAULT_LOCATION_CODE;
  const languageCode = (body.languageCode ?? DFS_DEFAULT_LANGUAGE_CODE).toLowerCase();
  const location = resolveLocation(locationCode);

  try {
    const [over, serpRes, coverage] = await Promise.all([
      fetchKeywordOverview({ keywords: [keyword], locationCode, locationName: location.name, languageCode }),
      fetchLiveSerp({ keyword, locationCode, languageCode, depth: 10 }),
      checkTechPivoCoverage(keyword),
    ]);
    logDataForSeoUsage("opportunity_analyze", over.cost, { keyword, locationCode });
    logDataForSeoUsage("opportunity_analyze", serpRes.cost, { keyword, locationCode });

    const metric = over.metrics[0] ? normalizeMetric(over.metrics[0]) : null;
    const intent = classifyIntent(keyword);
    const scored = scoreOpportunity({
      searchVolume: metric?.searchVolume ?? null,
      trendMonthly: metric?.trendMonthly ?? null,
      trendYearly: metric?.trendYearly ?? null,
      serpItemTypes: serpRes.serp.itemTypes,
      seResultsCount: serpRes.serp.seResultsCount,
      coverage: coverage.level,
      intent,
    });

    const supabase = createClient();
    const fetchedAt = new Date().toISOString();
    if (metric) {
      await supabase.from("keyword_snapshots").insert({
        keyword: metric.keyword,
        location_code: locationCode,
        language_code: languageCode,
        metrics: metric,
        source: "dataforseo",
        fetched_at: fetchedAt,
      });
    }

    const gap =
      coverage.level === "exact"
        ? "Already covered exactly — recommend UPDATE/EXPAND, not a new article."
        : serpRes.serp.itemTypes.some((t) => /discussions|forums|questions|reddit/i.test(t))
          ? "SERP shows Q&A/forum results — an original tested guide can add value."
          : "Check top results for missing steps, screenshots, current data, or local context.";

    const { data: opp, error } = await supabase
      .from("content_opportunities")
      .insert({
        category: body.category ?? null,
        primary_keyword: keyword,
        secondary_keywords: [],
        topic: keyword,
        location_code: locationCode,
        language_code: languageCode,
        intent,
        search_volume: metric?.searchVolume ?? null,
        trend: {
          monthly: metric?.trendMonthly ?? null,
          quarterly: metric?.trendQuarterly ?? null,
          yearly: metric?.trendYearly ?? null,
        },
        difficulty: metric?.keywordDifficulty ?? null,
        competition: metric?.competition ?? null,
        cpc: metric?.cpc ?? null,
        serp_features: serpRes.serp.itemTypes,
        se_results_count: serpRes.serp.seResultsCount,
        existing_coverage: coverage.level,
        coverage_matches: coverage.matches,
        content_gap: gap,
        score: scored.score,
        score_components: { ...scored.components, why: scored.why },
        status: "discovered",
        source_data: {
          provider: "dataforseo",
          serp_fetched_at: serpRes.serp.fetchedAt,
          metrics_fetched_at: metric?.fetchedAt ?? null,
          top_results: serpRes.serp.organic.slice(0, 5),
        },
      })
      .select("id, primary_keyword, score, status, existing_coverage")
      .single();

    if (error) {
      return NextResponse.json({ error: "Analysis ran, but saving failed. Retry." }, { status: 500 });
    }
    return NextResponse.json({
      opportunity: opp,
      score: scored.score,
      why: scored.why,
      coverage,
      metric,
      serp: { itemTypes: serpRes.serp.itemTypes, top: serpRes.serp.organic.slice(0, 5) },
    });
  } catch (err) {
    if (err instanceof DataForSeoError) {
      const http = err.status === "not_configured" ? 503 : 502;
      return NextResponse.json(
        { error: err.message, reason: err.status, retryable: err.retryable },
        { status: http }
      );
    }
    return NextResponse.json({ error: "Analysis failed.", reason: "unknown" }, { status: 500 });
  }
}
