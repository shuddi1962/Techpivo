/**
 * TechPivo Intelligence — real trend detection from measured snapshots.
 *
 * "Trending" here means measurable movement between stored DataForSEO
 * measurements, never a single high volume number. Every claim carries the
 * underlying points + timestamps so an editor can verify it.
 */

export type TrendDirection =
  | "breakout"
  | "rapid_growth"
  | "sustained_growth"
  | "emerging"
  | "stable"
  | "declining"
  | "insufficient_data";

export interface SnapshotPoint {
  fetchedAt: string;
  searchVolume: number | null;
  trendMonthly: number | null;
  trendYearly: number | null;
}

export interface TrendReport {
  keyword: string;
  locationCode: number;
  languageCode: string;
  points: number;
  currentVolume: number | null;
  previousVolume: number | null;
  changePct: number | null;
  direction: TrendDirection;
  /** Human-readable evidence lines, each backed by stored measurements. */
  evidence: string[];
  measuredAt: string;
}

/**
 * Classify movement between the earliest and latest usable snapshots.
 * Pure + deterministic (unit-tested). Requires >= 2 points with volumes.
 */
export function classifyTrend(
  keyword: string,
  locationCode: number,
  languageCode: string,
  snapshots: SnapshotPoint[]
): TrendReport {
  const measuredAt = new Date().toISOString();
  const usable = [...snapshots]
    .filter((s) => typeof s.searchVolume === "number" && (s.searchVolume as number) >= 0)
    .sort((a, b) => +new Date(a.fetchedAt) - +new Date(b.fetchedAt));

  const base = {
    keyword,
    locationCode,
    languageCode,
    points: usable.length,
    measuredAt,
  };

  if (usable.length < 2) {
    return {
      ...base,
      currentVolume: usable[0]?.searchVolume ?? null,
      previousVolume: null,
      changePct: null,
      direction: "insufficient_data",
      evidence: [
        `Only ${usable.length} measured snapshot${usable.length === 1 ? "" : "s"} — trending requires at least 2 measurements over time. Analyze the keyword again later to build history.`,
      ],
    };
  }

  const first = usable[0];
  const last = usable[usable.length - 1];
  const prev = first.searchVolume as number;
  const cur = last.searchVolume as number;

  if (prev <= 0 && cur > 0) {
    return {
      ...base,
      currentVolume: cur,
      previousVolume: prev,
      changePct: null,
      direction: "emerging",
      evidence: [
        `Volume appeared at ${cur.toLocaleString()}/mo (was ${prev}/mo on ${new Date(first.fetchedAt).toLocaleDateString()}).`,
        `Measured across ${usable.length} snapshots (${new Date(first.fetchedAt).toLocaleDateString()} → ${new Date(last.fetchedAt).toLocaleDateString()}). New demand — verify with a fresh lookup before committing resources.`,
      ],
    };
  }
  if (prev <= 0) {
    return {
      ...base,
      currentVolume: cur,
      previousVolume: prev,
      changePct: null,
      direction: "stable",
      evidence: ["No measurable volume in any snapshot — no trend to report."],
    };
  }

  const changePct = Math.round(((cur - prev) / prev) * 1000) / 10;
  const span = `${new Date(first.fetchedAt).toLocaleDateString()} → ${new Date(last.fetchedAt).toLocaleDateString()}`;
  const movementLine = `Volume ${prev.toLocaleString()} → ${cur.toLocaleString()}/mo (${changePct >= 0 ? "+" : ""}${changePct}%) across ${usable.length} snapshots (${span}).`;

  if (changePct >= 50) {
    return {
      ...base, currentVolume: cur, previousVolume: prev, changePct,
      direction: "breakout",
      evidence: [movementLine, "Breakout: +50% or more between first and latest measurement. Check SERP + coverage now — breakouts reward fast original coverage."],
    };
  }
  if (changePct >= 20) {
    return {
      ...base, currentVolume: cur, previousVolume: prev, changePct,
      direction: "rapid_growth",
      evidence: [movementLine, "Rapid growth: +20% or more. Rising demand — a good candidate for the opportunity queue."],
    };
  }
  if (changePct > 5) {
    return {
      ...base, currentVolume: cur, previousVolume: prev, changePct,
      direction: "sustained_growth",
      evidence: [movementLine, "Sustained growth: steady upward movement. Suitable for evergreen/tutorial investment."],
    };
  }
  if (changePct >= -15) {
    return {
      ...base, currentVolume: cur, previousVolume: prev, changePct,
      direction: "stable",
      evidence: [movementLine, "Stable: no meaningful movement. No trend action needed."],
    };
  }
  return {
    ...base, currentVolume: cur, previousVolume: prev, changePct,
    direction: "declining",
    evidence: [movementLine, "Declining: demand fell 15%+ between measurements. Deprioritize new coverage; consider updating rather than expanding."],
  };
}
