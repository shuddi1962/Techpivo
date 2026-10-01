import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRole } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/admin";
import { checkRateLimit, clientIp } from "@/lib/rate-limiter";
import { fetchRankedKeywords } from "@/lib/dataforseo";
import { DataForSeoError } from "@/lib/dataforseo/errors";
import { checkTechPivoCoverage } from "@/lib/intelligence/coverage";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const Body = z.object({
  id: z.string().uuid(),
  locationCode: z.number().int().positive().default(2840),
  limit: z.number().int().min(5).max(50).default(30),
});

/**
 * POST /api/admin/intelligence/competitors/refresh {id, locationCode?, limit?}
 * REAL competitor intelligence via DataForSEO Labs ranked_keywords (~$0.013):
 * pulls what the domain ranks for, checks TechPivo coverage on the top
 * keywords by volume, and stores genuine COMPETITOR GAPs. 5/hour/IP.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const rl = checkRateLimit(`intel-compref:${clientIp(request)}`, { limit: 5, windowMs: 3600_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Competitor refresh is rate-limited (5/hour) — Labs calls are paid." }, { status: 429 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json().catch(() => null));
  } catch {
    return NextResponse.json({ error: "Provide id (uuid)." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: comp, error: compErr } = await supabase
    .from("competitor_watch")
    .select("id, domain, observation")
    .eq("id", body.id)
    .single();
  if (compErr || !comp) return NextResponse.json({ error: "Competitor not found." }, { status: 404 });
  const domain = comp.domain as string;

  try {
    const ranked = await fetchRankedKeywords({ domain, locationCode: body.locationCode, languageCode: "en", limit: body.limit });
    const top = [...(ranked.data ?? [])]
      .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
      .slice(0, 10);

    const gaps: Array<{ keyword: string; search_volume: number | null; competitor_rank: number | null; coverage: string }> = [];
    for (const k of top) {
      const coverage = await checkTechPivoCoverage(k.keyword);
      if (coverage.level === "none" || coverage.level === "related") {
        gaps.push({ keyword: k.keyword, search_volume: k.searchVolume, competitor_rank: k.rankAbsolute, coverage: coverage.level });
      }
    }

    // Persist top competitor-gap keywords as content_gaps (source = labs).
    const fetchedAt = new Date().toISOString();
    for (const g of gaps.slice(0, 5)) {
      await supabase.from("content_gaps").insert({
        keyword: g.keyword,
        category: null,
        location_code: body.locationCode,
        language_code: "en",
        observation: `${domain} ranks ~#${g.competitor_rank ?? "?"} for "${g.keyword}" (${(g.search_volume ?? 0).toLocaleString()}/mo). TechPivo coverage: ${g.coverage}. Measured ${fetchedAt}.`,
        inference: "Hypothesis (verify): competitor-validated demand TechPivo doesn't cover — investigate an original angle.",
        gap_type: "competitor_gap",
        priority: (g.search_volume ?? 0) >= 1000 ? 8 : 6,
        status: "open",
        source: "dataforseo_labs",
      });
    }

    const entry = {
      last_refresh: fetchedAt,
      location_code: body.locationCode,
      endpoint: "dataforseo_labs/google/ranked_keywords/live",
      cost_usd: ranked.cost.cost ?? 0,
      keywords_checked: top.length,
      top_keywords: top.map((k) => ({ keyword: k.keyword, search_volume: k.searchVolume, rank: k.rankAbsolute })),
      gaps,
    };
    const prev = (comp.observation as { refreshes?: unknown[] } | null);
    const { data, error } = await supabase
      .from("competitor_watch")
      .update({
        observation: { ...((comp.observation as object) ?? {}), refreshes: [entry, ...((prev?.refreshes ?? []) as unknown[])].slice(0, 10) },
        last_checked: fetchedAt,
        updated_at: fetchedAt,
      })
      .eq("id", body.id)
      .select("id, domain, last_checked, observation")
      .single();
    if (error) return NextResponse.json({ error: "Refresh ran, but saving failed. Retry." }, { status: 500 });
    return NextResponse.json({ competitor: data, refresh: entry });
  } catch (err) {
    if (err instanceof DataForSeoError) {
      const http = err.status === "not_configured" ? 503 : 502;
      return NextResponse.json({ error: err.message, reason: err.status, retryable: err.retryable }, { status: http });
    }
    return NextResponse.json({ error: "Competitor refresh failed.", reason: "unknown" }, { status: 500 });
  }
}
