import { describe, it, expect } from "vitest";
import { normalizeMetric, momentum } from "@/lib/dataforseo/normalization";
import type { KeywordMetric } from "@/lib/dataforseo/types";

const base: KeywordMetric = {
  keyword: "  best ai coding tools  ",
  locationCode: 2840,
  locationName: "United States",
  languageCode: "en",
  searchVolume: 12100.6,
  cpc: 3.2,
  competition: 0.45,
  competitionLevel: "MEDIUM",
  keywordDifficulty: 62.7,
  monthlySearches: [
    { year: 2026, month: 7, searchVolume: 10000 },
    { year: 2026, month: 8, searchVolume: 11000 },
  ],
  trendMonthly: 10,
  trendQuarterly: 5,
  trendYearly: 20,
  lastUpdated: null,
  source: "dataforseo",
  fetchedAt: new Date().toISOString(),
};

describe("normalizeMetric", () => {
  it("trims keywords and rounds numeric fields", () => {
    const out = normalizeMetric(base);
    expect(out?.keyword).toBe("best ai coding tools");
    expect(out?.searchVolume).toBe(12101);
    expect(out?.keywordDifficulty).toBe(63);
  });

  it("rejects empty keywords", () => {
    expect(normalizeMetric({ ...base, keyword: "   " })).toBeNull();
  });

  it("clamps competition to 0..1 and drops negatives", () => {
    expect(normalizeMetric({ ...base, competition: 5 })?.competition).toBe(1);
    expect(normalizeMetric({ ...base, cpc: -2 })?.cpc).toBeNull();
  });
});

describe("momentum", () => {
  it("derives MoM change from monthly searches", () => {
    expect(momentum(base)).toBe(10);
  });

  it("falls back to provider trend with <2 months", () => {
    expect(momentum({ ...base, monthlySearches: [], trendMonthly: 4 })).toBe(4);
  });
});
