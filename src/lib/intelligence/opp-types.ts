/**
 * TechPivo Intelligence — opportunity type classifier (pure, rule-based).
 * Types derive from STORED signals only. An opportunity can carry several.
 */

export const OPPORTUNITY_TYPES = [
  "trending", "low_competition", "content_gap", "serp_gap", "competitor_gap",
  "news", "tutorial", "how_to", "problem", "comparison", "review",
  "commercial", "research", "community", "social", "ai_search", "local", "emerging",
] as const;

export interface TypeSignals {
  trendDirection?: string | null;
  keywordDifficulty?: number | null;
  competition?: number | null;
  searchVolume?: number | null;
  coverage?: string | null;
  serpItemTypes?: string[];
  intent?: string | null;
  aiSearchVolume?: number | null;
  communityDemand?: number | null;
  localIntent?: string | null;
  competitorGap?: boolean;
}

/** Deterministic classification (unit-tested). */
export function classifyOpportunityTypes(s: TypeSignals): string[] {
  const types = new Set<string>();
  const intent = (s.intent ?? "").toLowerCase();
  const dir = (s.trendDirection ?? "").toLowerCase();

  if (["breakout", "rapid_growth", "sustained_growth"].includes(dir)) types.add("trending");
  if (dir === "emerging") { types.add("emerging"); types.add("trending"); }
  if ((s.keywordDifficulty ?? 100) <= 30 && (s.searchVolume ?? 0) >= 100) types.add("low_competition");
  if (s.coverage === "none") types.add("content_gap");
  const weak = (s.serpItemTypes ?? []).some((t) => /discussions|forums|questions|reddit/i.test(t));
  if (weak) types.add("serp_gap");
  if (s.competitorGap) types.add("competitor_gap");
  if (/news|launch|announce|update|release/i.test(intent)) types.add("news");
  if (/tutorial|guide|how/i.test(intent)) { types.add("tutorial"); types.add("how_to"); }
  if (/fix|error|problem|troubleshoot|not working|failed/i.test(intent)) types.add("problem");
  if (/compar|vs|best|review|alternative/i.test(intent)) { types.add("comparison"); types.add("review"); }
  if (/commercial|transactional|buy|price|deal/i.test(intent)) types.add("commercial");
  if ((s.aiSearchVolume ?? 0) >= 100) types.add("ai_search");
  if ((s.communityDemand ?? 0) >= 3) { types.add("community"); types.add("social"); }
  if (s.localIntent && s.localIntent !== "non_local" && s.localIntent !== "global") types.add("local");
  if (/research|stud|benchmark|survey|test/i.test(intent)) types.add("research");

  return [...types].filter((t) => (OPPORTUNITY_TYPES as readonly string[]).includes(t));
}
