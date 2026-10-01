import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/admin";
import { checkRateLimit, clientIp } from "@/lib/rate-limiter";
import { titleOverlaps } from "@/lib/duplicate-check";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/intelligence/cannibalization — overlapping TechPivo pages.
 * Pairwise fuzzy title comparison over published posts (capped scan).
 * Recommends MERGE (exact/near-duplicate) / UPDATE / KEEP. Never deletes.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const rl = checkRateLimit(`intel-cann:${clientIp(request)}`, { limit: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited. Wait a minute and retry." }, { status: 429 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, slug, status, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(400);
  if (error) return NextResponse.json({ error: "Failed to load posts." }, { status: 500 });

  const rows = (data ?? []) as Array<{ id: string; title: string; slug: string; published_at: string }>;
  const clusters: Array<{ titles: string[]; slugs: string[]; recommendation: string }> = [];
  const used = new Set<string>();
  for (const p of rows) {
    if (used.has(p.id) || (p.title ?? "").length < 8) continue;
    const group = rows.filter(
      (q) => q.id !== p.id && !used.has(q.id) && titleOverlaps(p.title ?? "", q.title ?? "")
    );
    if (group.length === 0) continue;
    const titles = [p.title, ...group.map((g) => g.title)];
    const exact = group.some((g) => (g.title ?? "").trim().toLowerCase() === (p.title ?? "").trim().toLowerCase());
    for (const g of [p, ...group]) used.add(g.id);
    clusters.push({
      titles: titles.map((t) => (t ?? "").slice(0, 80)),
      slugs: [p.slug, ...group.map((g) => g.slug)],
      recommendation: exact
        ? "MERGE — near-identical titles target the same intent. Keep the stronger URL, redirect/merge the other."
        : "REVIEW — overlapping intent. UPDATE the stronger piece and REPOSITION or MERGE the weaker one. Never auto-delete.",
    });
    if (clusters.length >= 20) break;
  }

  return NextResponse.json({
    clusters,
    scanned: rows.length,
    measured_at: new Date().toISOString(),
    note: clusters.length === 0 ? "No overlapping title clusters found in the scanned posts." : undefined,
  });
}
