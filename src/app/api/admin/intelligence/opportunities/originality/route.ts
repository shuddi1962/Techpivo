import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRole } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/admin";
import { checkRateLimit, clientIp } from "@/lib/rate-limiter";
import { assessOriginality, isKnownEvidenceType } from "@/lib/intelligence/originality";

export const dynamic = "force-dynamic";

const Body = z.object({
  id: z.string().uuid(),
  evidence: z.array(z.string().trim().max(60)).max(20).default([]),
});

/**
 * POST /api/admin/intelligence/opportunities/originality {id, evidence[]}
 * Mandatory originality gate: the editor declares which original evidence the
 * plan includes. Rewrite-only plans fail with INSUFFICIENT ORIGINAL VALUE +
 * concrete next steps. The score is stored on the opportunity; the verdict is
 * never a ranking claim.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const rl = checkRateLimit(`intel-orig:${clientIp(request)}`, { limit: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited. Wait a minute and retry." }, { status: 429 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json().catch(() => null));
  } catch {
    return NextResponse.json({ error: "Provide id (uuid) and evidence list." }, { status: 400 });
  }

  const known = [...new Set(body.evidence.filter(isKnownEvidenceType))];
  const assessment = assessOriginality(known);

  const supabase = createClient();
  const { data: existing, error: readErr } = await supabase
    .from("content_opportunities")
    .select("score_components")
    .eq("id", body.id)
    .single();
  if (readErr || !existing) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
  const merged = { ...((existing.score_components as object) ?? {}), originality: assessment };
  const { data, error } = await supabase
    .from("content_opportunities")
    .update({
      originality_potential: assessment.score,
      score_components: merged,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id)
    .select("id, primary_keyword, originality_potential, status")
    .single();
  if (error) return NextResponse.json({ error: "Saving the assessment failed. Retry." }, { status: 500 });
  return NextResponse.json({ opportunity: data, assessment });
}
