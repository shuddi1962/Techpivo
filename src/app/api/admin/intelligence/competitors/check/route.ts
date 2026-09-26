import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRole } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/admin";
import { checkRateLimit, clientIp } from "@/lib/rate-limiter";
import { checkTechPivoCoverage } from "@/lib/intelligence/coverage";

export const dynamic = "force-dynamic";

const CheckBody = z.object({
  id: z.string().uuid(),
  topic: z.string().trim().min(2).max(80),
});

/**
 * POST /api/admin/intelligence/competitors/check {id, topic}
 * "What they cover that TechPivo doesn't": the admin names a topic the
 * competitor covers; TechPivo's own coverage is checked and the observation
 * is stored on the domain row. No competitor keywords are fabricated —
 * DataForSEO Labs domain endpoints are not integrated (stated in the UI).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const rl = checkRateLimit(`intel-comp:${clientIp(request)}`, { limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited. Wait a minute and retry." }, { status: 429 });
  }

  let body: z.infer<typeof CheckBody>;
  try {
    body = CheckBody.parse(await request.json().catch(() => null));
  } catch {
    return NextResponse.json({ error: "Provide id (uuid) and topic (2-80 chars)." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: comp, error: compErr } = await supabase
    .from("competitor_watch")
    .select("id, domain, observation")
    .eq("id", body.id)
    .single();
  if (compErr || !comp) return NextResponse.json({ error: "Competitor not found." }, { status: 404 });

  const coverage = await checkTechPivoCoverage(body.topic);
  const entry = {
    topic: body.topic,
    coverage: coverage.level,
    matches: coverage.matches.slice(0, 5),
    checked_at: new Date().toISOString(),
    conclusion:
      coverage.level === "none"
        ? `GAP: ${comp.domain as string} covers "${body.topic}" and TechPivo has no coverage — investigate an original angle.`
        : coverage.level === "exact"
          ? "Covered exactly — they cover it, but so does TechPivo. Consider UPDATE only if their version is stronger."
          : "Partial/related TechPivo coverage exists — consider EXPAND rather than a new article.",
  };
  const prevChecks = (comp.observation as { checks?: unknown[] } | null)?.checks;
  const prev = Array.isArray(prevChecks) ? prevChecks : [];
  const { data, error } = await supabase
    .from("competitor_watch")
    .update({
      observation: { ...((comp.observation as object) ?? {}), checks: [entry, ...prev].slice(0, 20) },
      last_checked: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id)
    .select("id, domain, last_checked, observation")
    .single();
  if (error) return NextResponse.json({ error: "Saving the check failed. Retry." }, { status: 500 });
  return NextResponse.json({ competitor: data, check: entry });
}
