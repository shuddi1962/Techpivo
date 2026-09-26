import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRole } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/admin";
import { checkRateLimit, clientIp } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

/** GET /api/admin/intelligence/briefs?status=&limit= — editorial briefs. */
export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 100);

  const supabase = createClient();
  let query = supabase
    .from("content_briefs")
    .select("id, topic, category, opportunity_score, status, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Failed to load briefs." }, { status: 500 });
  return NextResponse.json({ briefs: data ?? [] });
}

const Body = z.object({
  opportunityId: z.string().uuid(),
});

/**
 * POST /api/admin/intelligence/briefs {opportunityId}
 * Assembles an editorial RESEARCH PLAN from stored evidence only:
 * keyword metrics, SERP snapshot, gap findings, TechPivo coverage, originality
 * verdict. The brief never invents statistics — every number cites its stored
 * source + timestamp. Blocked while originality is INSUFFICIENT unless the
 * editor explicitly overrides (override is logged on the brief).
 */
const BriefBody = Body.extend({
  overrideOriginality: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const rl = checkRateLimit(`intel-brief:${clientIp(request)}`, { limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited. Wait a minute and retry." }, { status: 429 });
  }

  let body: z.infer<typeof BriefBody>;
  try {
    body = BriefBody.parse(await request.json().catch(() => null));
  } catch {
    return NextResponse.json({ error: "Provide opportunityId (uuid)." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: opp, error: oppErr } = await supabase
    .from("content_opportunities")
    .select("*")
    .eq("id", body.opportunityId)
    .single();
  if (oppErr || !opp) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });

  const orig = (opp.score_components as { originality?: { verdict?: string; score?: number } } | null)?.originality;
  if (orig?.verdict === "insufficient" && !body.overrideOriginality) {
    return NextResponse.json(
      {
        error: "Blocked by the originality gate (INSUFFICIENT ORIGINAL VALUE). Add original evidence via the originality check first, or resubmit with overrideOriginality:true (the override is recorded).",
        reason: "originality_gate",
      },
      { status: 409 }
    );
  }

  const { data: gaps } = await supabase
    .from("content_gaps")
    .select("gap_type, observation, inference, priority")
    .eq("keyword", opp.primary_keyword as string)
    .eq("status", "open")
    .order("priority", { ascending: false })
    .limit(10);

  const source = (opp.source_data as { serp_fetched_at?: string; metrics_fetched_at?: string | null; top_results?: unknown[] } | null) ?? {};
  const briefData = {
    working_title_draft: `${opp.primary_keyword as string} — editor to finalize (draft only, not a claim)`,
    primary_keyword: opp.primary_keyword,
    secondary_keywords: opp.secondary_keywords,
    intent: opp.intent,
    location_code: opp.location_code,
    language_code: opp.language_code,
    demand_evidence: {
      search_volume: opp.search_volume,
      trend: opp.trend,
      difficulty: opp.difficulty,
      competition: opp.competition,
      cpc: opp.cpc,
      metrics_fetched_at: source.metrics_fetched_at ?? null,
      source: "dataforseo (stored snapshot)",
    },
    serp_evidence: {
      features: opp.serp_features,
      top_results: source.top_results ?? [],
      serp_fetched_at: source.serp_fetched_at ?? null,
      source: "dataforseo live SERP (stored snapshot)",
    },
    techpivo_coverage: {
      level: opp.existing_coverage,
      matches: opp.coverage_matches,
      recommendation:
        opp.existing_coverage === "exact"
          ? "UPDATE/EXPAND the existing article — do not create a duplicate."
          : "New coverage is defensible; link related TechPivo pages.",
    },
    content_gaps: gaps ?? [],
    originality: orig ?? { verdict: "not_assessed", note: "Run the originality check before drafting." },
    originality_overridden: orig?.verdict === "insufficient" && body.overrideOriginality === true,
    required_next: [
      "Produce the declared original evidence and file it in the research workspace.",
      "Verify every factual claim against a primary/official source before drafting.",
      "Editor review is mandatory before any draft leaves this queue.",
    ],
    generated_from_opportunity: opp.id,
    generated_at: new Date().toISOString(),
  };

  const { data: brief, error: briefErr } = await supabase
    .from("content_briefs")
    .insert({
      topic: opp.topic as string,
      category: opp.category,
      brief_data: briefData,
      opportunity_score: (opp.score as number) ?? 0,
      status: "generated",
      created_by: auth.user.id,
    })
    .select("id, topic, status, opportunity_score")
    .single();
  if (briefErr) return NextResponse.json({ error: "Brief assembled, but saving failed. Retry." }, { status: 500 });

  await supabase
    .from("content_opportunities")
    .update({ status: "brief_ready", updated_at: new Date().toISOString() })
    .eq("id", opp.id as string);

  return NextResponse.json({ brief, brief_data: briefData }, { status: 201 });
}
