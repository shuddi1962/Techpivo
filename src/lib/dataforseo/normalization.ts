import type { KeywordMetric } from "./types";

/**
 * Normalize + validate keyword metrics before DB writes or UI render.
 * Rejects empty keywords and clamps out-of-range competition values so a
 * malformed provider row can never poison TechPivo snapshots.
 */
export function normalizeMetric(m: KeywordMetric): KeywordMetric | null {
  const keyword = m.keyword.trim().slice(0, 80);
  if (!keyword) return null;
  const clamp01 = (v: number | null) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : null;
  const nonNeg = (v: number | null) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
  return {
    ...m,
    keyword,
    searchVolume: nonNeg(m.searchVolume) === null ? null : Math.round(m.searchVolume as number),
    cpc: nonNeg(m.cpc),
    competition: clamp01(m.competition),
    keywordDifficulty:
      typeof m.keywordDifficulty === "number" && Number.isFinite(m.keywordDifficulty)
        ? Math.min(100, Math.max(0, Math.round(m.keywordDifficulty)))
        : null,
    monthlySearches: (m.monthlySearches ?? [])
      .filter((s) => s.year >= 2000 && s.year <= 2100 && s.month >= 1 && s.month <= 12)
      .slice(0, 24),
  };
}

/** Month-over-month % change derived from monthly_searches (null when unavailable). */
export function momentum(m: KeywordMetric): number | null {
  const s = [...m.monthlySearches].sort((a, b) => a.year - b.year || a.month - b.month);
  if (s.length < 2) return m.trendMonthly;
  const prev = s[s.length - 2].searchVolume;
  const cur = s[s.length - 1].searchVolume;
  if (!prev || prev <= 0) return m.trendMonthly;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}
