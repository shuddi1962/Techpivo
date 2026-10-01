import { createClient } from "@/lib/supabase/admin";
import { classifyTrend } from "./trends";

/**
 * TechPivo Intelligence — "What should TechPivo do today?" (SERVER-ONLY).
 * Every recommendation cites real stored rows: trend movements, open gaps,
 * competitor gaps with no coverage, community demand, briefs awaiting review.
 * Nothing is fabricated; empty sections render as "no signal".
 */

export interface DailyRecommendation {
  rank: number;
  title: string;
  why: string;
  sources: string[];
  action: string;
}

export async function getDailyIntel(limit = 8): Promise<{ recommendations: DailyRecommendation[]; measuredAt: string }> {
  const supabase = createClient();
  const recs: DailyRecommendation[] = [];
  const push = (r: Omit<DailyRecommendation, "rank">) => {
    if (recs.length < limit) recs.push({ ...r, rank: recs.length + 1 });
  };

  // 1. Breakout / rapid trends from snapshot history (>= 2 measurements).
  const { data: snaps } = await supabase
    .from("keyword_snapshots")
    .select("keyword, location_code, language_code, metrics, fetched_at")
    .order("fetched_at", { ascending: true })
    .limit(2000);
  const groups = new Map<string, Array<{ fetchedAt: string; searchVolume: number | null; trendMonthly: number | null; trendYearly: number | null }>>();
  for (const s of (snaps ?? []) as Array<{ keyword: string; location_code: number; language_code: string; metrics: { searchVolume?: number | null; trendMonthly?: number | null; trendYearly?: number | null }; fetched_at: string }>) {
    const key = `${s.keyword}|${s.location_code}|${s.language_code}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ fetchedAt: s.fetched_at, searchVolume: s.metrics?.searchVolume ?? null, trendMonthly: s.metrics?.trendMonthly ?? null, trendYearly: s.metrics?.trendYearly ?? null });
  }
  for (const [key, points] of groups) {
    if (points.length < 2) continue;
    const [keyword] = key.split("|");
    const rep = classifyTrend(keyword, 0, "", points);
    if (rep.direction === "breakout" || rep.direction === "rapid_growth") {
      push({
        title: `${rep.direction === "breakout" ? "Breakout" : "Rapid growth"}: "${keyword}" (${rep.changePct}% across ${rep.points} measurements)`,
        why: rep.evidence.join(" "),
        sources: ["keyword_snapshots"],
        action: "Open the opportunity (or analyze the keyword) and check SERP + coverage today.",
      });
    }
    if (recs.length >= limit) break;
  }

  // 2. High-priority open gaps.
  const { data: gaps } = await supabase
    .from("content_gaps")
    .select("keyword, gap_type, observation, priority")
    .eq("status", "open")
    .gte("priority", 7)
    .order("priority", { ascending: false })
    .limit(3);
  for (const g of (gaps ?? []) as Array<{ keyword: string; gap_type: string; observation: string; priority: number }>) {
    push({
      title: `SERP gap (priority ${g.priority}/10): "${g.keyword}" — ${g.gap_type}`,
      why: g.observation,
      sources: ["content_gaps"],
      action: "Attach an originality plan, then generate the brief.",
    });
  }

  // 3. Competitor gaps with no TechPivo coverage (latest check per domain).
  const { data: comps } = await supabase
    .from("competitor_watch")
    .select("domain, observation")
    .eq("is_active", true)
    .limit(20);
  for (const c of (comps ?? []) as Array<{ domain: string; observation: { checks?: Array<{ topic: string; coverage: string }> } | null }>) {
    const noCov = c.observation?.checks?.find((x) => x.coverage === "none");
    if (noCov) {
      push({
        title: `Competitor gap: ${c.domain} covers "${noCov.topic}" — TechPivo has nothing`,
        why: "Latest TechPivo-coverage check on a tracked competitor topic found no coverage.",
        sources: ["competitor_watch"],
        action: "Investigate an original angle before they consolidate the topic.",
      });
    }
    if (recs.length >= limit) break;
  }

  // 4. Briefs awaiting review.
  const { data: briefs } = await supabase
    .from("content_briefs")
    .select("id, topic")
    .eq("status", "generated")
    .limit(3);
  for (const b of (briefs ?? []) as Array<{ id: string; topic: string }>) {
    push({
      title: `Brief awaiting review: "${(b.topic ?? "").slice(0, 70)}"`,
      why: "Evidence-only brief is generated and needs an editor decision.",
      sources: ["content_briefs"],
      action: "Review, approve, and move research into the workspace.",
    });
  }

  return { recommendations: recs, measuredAt: new Date().toISOString() };
}
