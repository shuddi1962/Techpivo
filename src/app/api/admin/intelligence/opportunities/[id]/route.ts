import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/admin";
import { checkRateLimit, clientIp } from "@/lib/rate-limiter";
import { TOOL_REGISTRY } from "@/lib/tools-registry";
import { titleOverlaps } from "@/lib/duplicate-check";

/**
 * GET /api/admin/intelligence/opportunities/[id] — full intelligence report.
 * Assembles demand + trend + SERP + gaps + TechPivo coverage + community +
 * tools + originality + brief status from STORED rows (no API spend).
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const rl = checkRateLimit(`intel-detail:${clientIp(request)}`, { limit: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited. Wait a minute and retry." }, { status: 429 });
  }

  if (!/^[0-9a-f-]{36}$/i.test(params.id)) {
    return NextResponse.json({ error: "Provide a valid opportunity id." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: opp, error } = await supabase
    .from("content_opportunities")
    .select("*")
    .eq("id", params.id)
    .single();
  if (error || !opp) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });

  const keyword = opp.primary_keyword as string;
  const [{ data: snaps }, { data: gaps }, { data: briefs }] = await Promise.all([
    supabase.from("keyword_snapshots").select("location_code, language_code, metrics, fetched_at").eq("keyword", keyword).order("fetched_at", { ascending: false }).limit(20),
    supabase.from("content_gaps").select("gap_type, observation, inference, priority, status, created_at").eq("keyword", keyword).order("priority", { ascending: false }).limit(10),
    supabase.from("content_briefs").select("id, status, opportunity_score, created_at").eq("topic", opp.topic as string).order("created_at", { ascending: false }).limit(5),
  ]);

  // Community matches: forum titles overlapping the keyword (capped scan).
  const { data: forum } = await supabase.from("forum_posts").select("id, title, vote_count, reply_count").order("created_at", { ascending: false }).limit(300);
  const community = ((forum ?? []) as Array<{ id: string; title: string; vote_count: number | null; reply_count: number | null }>)
    .filter((f) => titleOverlaps(keyword, f.title ?? ""))
    .slice(0, 5)
    .map((f) => ({ title: (f.title ?? "").slice(0, 80), votes: f.vote_count ?? 0, replies: f.reply_count ?? 0 }));

  // Tool relevance from the registry (in-memory, no DB cost).
  const tools = TOOL_REGISTRY
    .filter((t) => titleOverlaps(keyword, t.name) || titleOverlaps(keyword, t.description))
    .slice(0, 5)
    .map((t) => ({ slug: t.slug, name: t.name }));

  const source = (opp.source_data ?? {}) as { serp_fetched_at?: string; metrics_fetched_at?: string | null; top_results?: Array<{ position: number; title: string; url: string; domain: string; description: string | null }> };
  const scoreComp = (opp.score_components ?? {}) as { why?: string[]; originality?: { verdict?: string; score?: number } };

  return NextResponse.json({
    opportunity: {
      id: opp.id, keyword, topic: opp.topic, category: opp.category,
      intent: opp.intent, status: opp.status, score: opp.score,
      types: opp.opp_types ?? [],
      location_code: opp.location_code, language_code: opp.language_code,
      created_at: opp.created_at, updated_at: opp.updated_at,
    },
    demand: {
      search_volume: opp.search_volume, trend: opp.trend,
      difficulty: opp.difficulty, competition: opp.competition, cpc: opp.cpc,
      snapshots: snaps ?? [],
      metrics_source: "dataforseo (stored)",
    },
    serp: {
      features: opp.serp_features ?? [],
      top_results: source.top_results ?? [],
      serp_fetched_at: source.serp_fetched_at ?? null,
    },
    gaps: gaps ?? [],
    coverage: { level: opp.existing_coverage, matches: opp.coverage_matches ?? [] },
    community: { matches: community, note: community.length === 0 ? "No overlapping community questions found in the last 300 discussions." : undefined },
    tools: { matches: tools, note: tools.length === 0 ? "No registry tool matches this keyword." : undefined },
    originality: scoreComp.originality ?? { verdict: "not_assessed" },
    score_breakdown: scoreComp,
    briefs: briefs ?? [],
  });
}
