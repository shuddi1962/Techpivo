import type { CoverageLevel } from "./coverage";

export interface ScoreInputs {
  searchVolume: number | null;
  trendMonthly: number | null;
  trendYearly: number | null;
  serpItemTypes: string[];
  seResultsCount: number | null;
  coverage: CoverageLevel;
  intent: string;
}

export interface OpportunityScore {
  /** 0-100 internal priority. NOT a ranking probability. */
  score: number;
  components: { demand: number; growth: number; serpGap: number; coverage: number; intentFit: number };
  why: string[];
}

const WEAK_SERP_SIGNALS = ["discussions", "forums", "questions_answers", "reddit", "people_also_ask"];

/**
 * Explainable internal priority from measurable signals only.
 * Raw components are stored separately; `why` lines render in admin.
 * Never describe this as a chance of ranking #1.
 */
export function scoreOpportunity(i: ScoreInputs): OpportunityScore {
  const why: string[] = [];

  // Demand 0-30 (log scale on monthly volume)
  const v = i.searchVolume ?? 0;
  const demand = v >= 10000 ? 30 : v >= 1000 ? 22 : v >= 100 ? 14 : v > 0 ? 7 : 0;
  why.push(demand >= 22 ? `Demand: strong (${v.toLocaleString()}/mo)` : demand > 0 ? `Demand: modest (${v.toLocaleString()}/mo)` : "Demand: no measured volume");

  // Growth 0-15 (measured movement, not vibes)
  const m = i.trendMonthly ?? 0;
  const y = i.trendYearly ?? 0;
  const growth = m >= 20 || y >= 50 ? 15 : m >= 5 || y >= 15 ? 10 : m > 0 || y > 0 ? 5 : 0;
  why.push(growth >= 10 ? "Trend: rising" : growth > 0 ? "Trend: slightly up" : "Trend: flat/declining/unknown");

  // SERP gap 0-20 (observable composition only — forums/Q&A = softer targets)
  const types = i.serpItemTypes.map((t) => t.toLowerCase());
  const weak = types.filter((t) => WEAK_SERP_SIGNALS.some((s) => t.includes(s)));
  const serpGap = weak.length > 0 ? 14 : types.includes("video") || types.includes("images") ? 8 : 4;
  why.push(weak.length > 0 ? `SERP gap: Q&A/forum results present (${weak.slice(0, 3).join(", ")})` : "SERP gap: standard commercial/editorial mix");

  // Coverage 0-20 (white space inside TechPivo)
  const coverage = i.coverage === "none" ? 20 : i.coverage === "related" ? 12 : i.coverage === "partial" ? 6 : 0;
  why.push(
    i.coverage === "none"
      ? "Existing TechPivo coverage: none"
      : i.coverage === "exact"
        ? "Existing TechPivo coverage: exact — recommend UPDATE, not a new article"
        : `Existing TechPivo coverage: ${i.coverage} — consider expand/merge`
  );

  // Intent fit 0-15 (question/comparison/tutorial intents suit original guides)
  const intent = i.intent.toLowerCase();
  const questiony = /question|how|what|why|best|vs|compare|review|tutorial|guide|fix|error/.test(intent);
  const intentFit = questiony ? 12 : 6;
  why.push(`Intent: ${i.intent}${questiony ? " — suits an original guide/test" : ""}`);

  const score = Math.min(100, demand + growth + serpGap + coverage + intentFit);
  return { score, components: { demand, growth, serpGap, coverage, intentFit }, why };
}
