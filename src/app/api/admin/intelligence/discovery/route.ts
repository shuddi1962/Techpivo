import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRole } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/admin";
import { checkRateLimit, clientIp } from "@/lib/rate-limiter";
import {
  fetchKeywordSuggestions,
  normalizeMetric,
  logDataForSeoUsage,
  DFS_VERIFIED_LOCATIONS,
  resolveLocation,
  DFS_DEFAULT_LANGUAGE_CODE,
  type DataForSeoCost,
} from "@/lib/dataforseo";
import { DataForSeoError } from "@/lib/dataforseo/errors";
import { buildCategorySeeds, depthCaps } from "@/lib/intelligence/discovery";
import { checkTechPivoCoverage } from "@/lib/intelligence/coverage";
import { classifyIntent } from "@/lib/keyword-intelligence";
import { classifyOpportunityTypes } from "@/lib/intelligence/opp-types";
import { classifyLocalIntent } from "@/lib/intelligence/local-intent";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const RunBody = z.object({
  category: z.string().trim().min(2).max(80),
  markets: z.array(z.number().int().positive()).min(1).max(4).default([2840]),
  languageCode: z.string().trim().min(2).max(10).default("en"),
  depth: z.enum(["broad", "standard", "deep"]).default("standard"),
});

/** GET /api/admin/intelligence/discovery — run history (newest first). */
export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 10, 1), 50);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("discovery_runs")
    .select("id, category, markets, language_code, depth, sources, seeds, stats, status, error, cost_usd, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: "Failed to load discovery runs." }, { status: 500 });
  return NextResponse.json({ runs: data ?? [] });
}

/**
 * POST /api/admin/intelligence/discovery — category discovery run.
 * Seeds come from TechPivo's own DB; suggestions fan out seed × market with
 * strict depth caps. Creates lightweight opportunities (demand pool — run
 * Analyze for the SERP deep-dive). Every run records config + stats + real
 * DataForSEO cost. Max ~5 runs/hour per IP (paid API guard).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const rl = checkRateLimit(`intel-discover:${clientIp(request)}`, { limit: 5, windowMs: 3600_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Discovery is rate-limited (5 runs/hour) — DataForSEO is a paid API." }, { status: 429 });
  }

  let body: z.infer<typeof RunBody>;
  try {
    body = RunBody.parse(await request.json().catch(() => null));
  } catch {
    return NextResponse.json({ error: "Provide category (2-80 chars), markets (1-4 location codes), languageCode, depth." }, { status: 400 });
  }

  const knownCodes = new Set(DFS_VERIFIED_LOCATIONS.map((l) => l.code));
  const markets = [...new Set(body.markets)].filter((m) => knownCodes.has(m));
  if (markets.length === 0) {
    return NextResponse.json({ error: "No supported markets. Use verified location codes (US 2840, UK 2826, Nigeria 2566, ...)." }, { status: 400 });
  }
  const languageCode = body.languageCode.toLowerCase();
  const caps = depthCaps(body.depth);
  const supabase = createClient();
  const costs: DataForSeoCost[] = [];
  const track = (c: DataForSeoCost) => { costs.push(c); };

  try {
    const seedPack = await buildCategorySeeds(body.category, caps.seeds * 2);
    const seeds = seedPack.seeds.slice(0, caps.seeds);
    if (seeds.length === 0) {
      return NextResponse.json({ error: `No seeds could be built for "${body.category}" — the category has no matching posts, tools, community or tracked keywords yet.` }, { status: 400 });
    }

    // Fan out: seed × market suggestion calls, chunked.
    const jobs: Array<{ seed: string; market: number }> = [];
    for (const seed of seeds) for (const market of markets.slice(0, caps.markets)) jobs.push({ seed, market });

    type Sug = { keyword: string; market: number; metric: NonNullable<ReturnType<typeof normalizeMetric>> };
    const found: Sug[] = [];
    for (let i = 0; i < jobs.length; i += 6) {
      const chunk = await Promise.allSettled(
        jobs.slice(i, i + 6).map(async (j) => {
          const location = resolveLocation(j.market, DFS_VERIFIED_LOCATIONS);
          const res = await fetchKeywordSuggestions({ seed: j.seed, keywords: [], locationCode: j.market, locationName: location.name, languageCode, limit: caps.suggestionsPerSeed });
          track(res.cost);
          return { job: j, suggestions: res.suggestions };
        })
      );
      for (const r of chunk) {
        if (r.status !== "fulfilled") continue;
        for (const s of r.value.suggestions) {
          const metric = normalizeMetric(s);
          if (metric) found.push({ keyword: metric.keyword, market: r.value.job.market, metric });
        }
      }
    }

    // Dedupe by keyword+market, keep highest volume.
    const best = new Map<string, Sug>();
    for (const f of found) {
      const key = `${f.keyword.toLowerCase()}|${f.market}`;
      const prev = best.get(key);
      if (!prev || (f.metric.searchVolume ?? 0) > (prev.metric.searchVolume ?? 0)) best.set(key, f);
    }

    let snapshots = 0;
    let created = 0;
    let skipped = 0;
    const fetchedAt = new Date().toISOString();
    for (const f of best.values()) {
      await supabase.from("keyword_snapshots").insert({
        keyword: f.metric.keyword,
        location_code: f.market,
        language_code: languageCode,
        metrics: f.metric,
        source: "dataforseo",
        fetched_at: fetchedAt,
      });
      snapshots += 1;

      const { data: existing } = await supabase
        .from("content_opportunities")
        .select("id")
        .eq("primary_keyword", f.metric.keyword)
        .eq("location_code", f.market)
        .limit(1);
      if (existing && existing.length > 0) { skipped += 1; continue; }

      const coverage = await checkTechPivoCoverage(f.metric.keyword);
      const intent = classifyIntent(f.metric.keyword);
      const local = classifyLocalIntent(f.metric.keyword);
      const types = classifyOpportunityTypes({
        keywordDifficulty: f.metric.keywordDifficulty,
        competition: f.metric.competition,
        searchVolume: f.metric.searchVolume,
        coverage: coverage.level,
        serpItemTypes: [],
        intent,
        localIntent: local.scope,
      });
      // Demand-only priority (no SERP yet): volume + whitespace + intent fit.
      const v = f.metric.searchVolume ?? 0;
      const score = Math.min(100,
        (v >= 10000 ? 30 : v >= 1000 ? 22 : v >= 100 ? 14 : v > 0 ? 7 : 0) +
        (coverage.level === "none" ? 20 : coverage.level === "related" ? 12 : coverage.level === "partial" ? 6 : 0) +
        (/question|how|what|why|best|vs|compare|review|tutorial|guide|fix|error/.test(intent.toLowerCase()) ? 12 : 6));

      const { error: insErr } = await supabase.from("content_opportunities").insert({
        category: body.category,
        primary_keyword: f.metric.keyword,
        secondary_keywords: [],
        topic: f.metric.keyword,
        location_code: f.market,
        language_code: languageCode,
        intent,
        search_volume: f.metric.searchVolume,
        trend: { monthly: f.metric.trendMonthly, quarterly: f.metric.trendQuarterly, yearly: f.metric.trendYearly },
        difficulty: f.metric.keywordDifficulty,
        competition: f.metric.competition,
        cpc: f.metric.cpc,
        serp_features: [],
        existing_coverage: coverage.level,
        coverage_matches: coverage.matches,
        content_gap: "Discovery-stage: SERP not yet captured — run Analyze for the gap deep-dive.",
        score,
        score_components: {
          demand: 0, growth: 0, serpGap: 0, coverage: 0, intentFit: 0,
          discovery: { score, note: "Demand-pool score (no SERP yet). Run Analyze for the full explainable score." },
        },
        opp_types: types,
        status: "discovered",
        source_data: {
          provider: "dataforseo",
          discovery: true,
          local_intent: local,
          location_name: resolveLocation(f.market, DFS_VERIFIED_LOCATIONS).name,
          metrics_fetched_at: f.metric.fetchedAt,
        },
      });
      if (!insErr) created += 1;
    }

    const totalCost = costs.reduce((s, c) => s + (c.cost ?? 0), 0);
    const stats = {
      seeds: seeds.length, markets: markets.length,
      suggestion_calls: jobs.length, keywords_found: best.size,
      snapshots, opportunities_created: created, opportunities_skipped: skipped,
      seed_sources: seedPack.sources,
    };
    const { data: run } = await supabase.from("discovery_runs").insert({
      category: body.category, markets, language_code: languageCode,
      depth: body.depth, sources: ["keyword"], seeds,
      stats, status: "completed", cost_usd: Math.round(totalCost * 10000) / 10000,
      created_by: auth.user.id,
    }).select("id").single();
    for (const c of costs) logDataForSeoUsage("discovery_run", c, { run_id: run?.id ?? null, category: body.category });

    return NextResponse.json({
      run_id: run?.id ?? null, category: body.category,
      stats, cost_usd: Math.round(totalCost * 10000) / 10000,
      markets: markets.map((m) => resolveLocation(m, DFS_VERIFIED_LOCATIONS).name),
    }, { status: 201 });
  } catch (err) {
    if (err instanceof DataForSeoError) {
      const http = err.status === "not_configured" ? 503 : 502;
      return NextResponse.json({ error: err.message, reason: err.status, retryable: err.retryable }, { status: http });
    }
    return NextResponse.json({ error: "Discovery run failed.", reason: "unknown" }, { status: 500 });
  }
}
