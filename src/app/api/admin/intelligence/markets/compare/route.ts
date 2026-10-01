import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRole } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/admin";
import { checkRateLimit, clientIp } from "@/lib/rate-limiter";
import {
  fetchKeywordOverview,
  normalizeMetric,
  DFS_VERIFIED_LOCATIONS,
  resolveLocation,
  DFS_DEFAULT_LANGUAGE_CODE,
} from "@/lib/dataforseo";
import { DataForSeoError } from "@/lib/dataforseo/errors";
import { checkTechPivoCoverage } from "@/lib/intelligence/coverage";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const Body = z.object({
  keyword: z.string().trim().min(2).max(80),
  markets: z.array(z.number().int().positive()).min(2).max(6),
  languageCode: z.string().trim().min(2).max(10).optional(),
});

/**
 * POST /api/admin/intelligence/markets/compare {keyword, markets[]}
 * "How does demand for this topic differ between markets?" — one live
 * overview call per market (paid; capped at 6) + TechPivo coverage once.
 * Every cell carries source + timestamp. 10/min/IP.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const rl = checkRateLimit(`intel-markets:${clientIp(request)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited. Wait a minute and retry." }, { status: 429 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json().catch(() => null));
  } catch {
    return NextResponse.json({ error: "Provide keyword (2-80 chars) and markets (2-6 location codes)." }, { status: 400 });
  }

  const known = new Set(DFS_VERIFIED_LOCATIONS.map((l) => l.code));
  const markets = [...new Set(body.markets)].filter((m) => known.has(m)).slice(0, 6);
  if (markets.length < 2) {
    return NextResponse.json({ error: "Need at least 2 supported markets (US 2840, UK 2826, Nigeria 2566, ...)." }, { status: 400 });
  }
  const languageCode = (body.languageCode ?? DFS_DEFAULT_LANGUAGE_CODE).toLowerCase();
  const keyword = body.keyword.trim();

  try {
    const coverage = await checkTechPivoCoverage(keyword);
    const rows = await Promise.all(
      markets.map(async (market) => {
        const location = resolveLocation(market, DFS_VERIFIED_LOCATIONS);
        try {
          const over = await fetchKeywordOverview({ keywords: [keyword], locationCode: market, locationName: location.name, languageCode });
          const metric = over.metrics[0] ? normalizeMetric(over.metrics[0]) : null;
          return {
            market, market_name: location.name,
            search_volume: metric?.searchVolume ?? null,
            trend_monthly: metric?.trendMonthly ?? null,
            trend_yearly: metric?.trendYearly ?? null,
            cpc: metric?.cpc ?? null,
            competition: metric?.competition ?? null,
            difficulty: metric?.keywordDifficulty ?? null,
            cost_usd: over.cost.cost ?? 0,
            fetched_at: metric?.fetchedAt ?? new Date().toISOString(),
            source: "dataforseo",
          };
        } catch (err) {
          return {
            market, market_name: location.name,
            search_volume: null, trend_monthly: null, trend_yearly: null,
            cpc: null, competition: null, difficulty: null, cost_usd: 0,
            fetched_at: new Date().toISOString(), source: "dataforseo",
            error: err instanceof DataForSeoError ? err.message : "Market lookup failed.",
          };
        }
      })
    );

    // Persist each successful market measurement as a snapshot (trend history).
    const supabase = createClient();
    const fetchedAt = new Date().toISOString();
    for (let i = 0; i < markets.length; i++) {
      const r = rows[i];
      if (r.search_volume === null && r.error) continue;
      await supabase.from("keyword_snapshots").insert({
        keyword, location_code: markets[i], language_code: languageCode,
        metrics: {
          keyword, locationCode: markets[i], locationName: r.market_name, languageCode,
          searchVolume: r.search_volume, cpc: r.cpc, competition: r.competition,
          competitionLevel: null, keywordDifficulty: r.difficulty,
          monthlySearches: [], trendMonthly: r.trend_monthly, trendQuarterly: null, trendYearly: r.trend_yearly,
          lastUpdated: null, source: "dataforseo", fetchedAt,
        },
        source: "dataforseo", fetched_at: fetchedAt,
      });
    }

    const totalCost = rows.reduce((s, r) => s + (r.cost_usd ?? 0), 0);
    return NextResponse.json({
      keyword, language: languageCode, markets: rows,
      techpivo_coverage: coverage,
      total_cost_usd: Math.round(totalCost * 10000) / 10000,
    });
  } catch (err) {
    if (err instanceof DataForSeoError) {
      const http = err.status === "not_configured" ? 503 : 502;
      return NextResponse.json({ error: err.message, reason: err.status, retryable: err.retryable }, { status: http });
    }
    return NextResponse.json({ error: "Market comparison failed.", reason: "unknown" }, { status: 500 });
  }
}
