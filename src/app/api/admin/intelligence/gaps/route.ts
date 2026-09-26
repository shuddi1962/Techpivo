import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRole } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/admin";
import { checkRateLimit, clientIp } from "@/lib/rate-limiter";
import { analyzeSerpGaps } from "@/lib/intelligence/serp-gaps";

export const dynamic = "force-dynamic";

const GAP_STATUSES = ["open", "briefed", "published", "dismissed"] as const;

/** GET /api/admin/intelligence/gaps?status=&limit= — stored gap findings. */
export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 100);

  const supabase = createClient();
  let query = supabase
    .from("content_gaps")
    .select("id, keyword, category, location_code, observation, inference, gap_type, priority, status, created_at", { count: "exact" })
    .order("priority", { ascending: false })
    .limit(limit);
  if (status && (GAP_STATUSES as readonly string[]).includes(status)) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: "Failed to load gaps." }, { status: 500 });
  return NextResponse.json({ total: count ?? 0, gaps: data ?? [] });
}

const AnalyzeBody = z.object({
  opportunityId: z.string().uuid(),
});

/**
 * POST /api/admin/intelligence/gaps/analyze {opportunityId}
 * Runs the observation/inference analyzer over the opportunity's STORED SERP
 * (no new DataForSEO spend) and persists findings to content_gaps.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const rl = checkRateLimit(`intel-gaps:${clientIp(request)}`, { limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited. Wait a minute and retry." }, { status: 429 });
  }

  let body: z.infer<typeof AnalyzeBody>;
  try {
    body = AnalyzeBody.parse(await request.json().catch(() => null));
  } catch {
    return NextResponse.json({ error: "Provide opportunityId (uuid)." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: opp, error: oppErr } = await supabase
    .from("content_opportunities")
    .select("id, primary_keyword, category, location_code, language_code, serp_features, source_data")
    .eq("id", body.opportunityId)
    .single();
  if (oppErr || !opp) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });

  const source = (opp.source_data ?? {}) as {
    serp_fetched_at?: string; top_results?: Array<{ position: number; title: string; url: string; domain: string; description: string | null; isFeaturedSnippet?: boolean }>;
  };
  const organic = (source.top_results ?? []).map((r) => ({
    position: r.position,
    title: r.title ?? "",
    url: r.url ?? "",
    domain: r.domain ?? "",
    description: r.description ?? null,
    isFeaturedSnippet: r.isFeaturedSnippet ?? false,
  }));
  if (organic.length === 0) {
    return NextResponse.json(
      { error: "No stored SERP for this opportunity — analyze it again to capture fresh SERP data first." },
      { status: 400 }
    );
  }

  const findings = analyzeSerpGaps({
    keyword: opp.primary_keyword as string,
    itemTypes: (opp.serp_features ?? []) as string[],
    organic,
    seResultsCount: null,
  });

  const rows = findings.map((f) => ({
    keyword: opp.primary_keyword,
    category: opp.category,
    location_code: opp.location_code,
    language_code: opp.language_code,
    observation: `${f.observation} (SERP captured ${source.serp_fetched_at ?? "unknown"}; top ${organic.length} results)`,
    inference: f.inference,
    gap_type: f.gapType,
    priority: f.priority,
    status: "open",
    source: "dataforseo",
  }));

  const { data: inserted, error: insErr } = await supabase
    .from("content_gaps")
    .insert(rows)
    .select("id, gap_type, priority, status");
  if (insErr) return NextResponse.json({ error: "Gap analysis ran, but saving failed. Retry." }, { status: 500 });
  return NextResponse.json({ findings: inserted });
}
