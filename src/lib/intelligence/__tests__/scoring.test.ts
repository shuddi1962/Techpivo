import { describe, it, expect } from "vitest";
import { scoreOpportunity } from "@/lib/intelligence/scoring";

describe("scoreOpportunity", () => {
  it("rewards strong demand + whitespace", () => {
    const s = scoreOpportunity({
      searchVolume: 18100,
      trendMonthly: 25,
      trendYearly: 60,
      serpItemTypes: ["organic", "discussions", "related_searches"],
      seResultsCount: 82,
      coverage: "none",
      intent: "commercial",
    });
    expect(s.score).toBeGreaterThanOrEqual(70);
    expect(s.components.demand).toBe(30);
    expect(s.components.coverage).toBe(20);
    expect(s.why.length).toBe(5);
  });

  it("zeroes coverage component on exact matches (update, don't duplicate)", () => {
    const s = scoreOpportunity({
      searchVolume: 5000,
      trendMonthly: 0,
      trendYearly: 0,
      serpItemTypes: ["organic"],
      seResultsCount: null,
      coverage: "exact",
      intent: "informational",
    });
    expect(s.components.coverage).toBe(0);
    expect(s.why.join(" ")).toMatch(/UPDATE/);
  });

  it("handles null volume without NaN", () => {
    const s = scoreOpportunity({
      searchVolume: null,
      trendMonthly: null,
      trendYearly: null,
      serpItemTypes: [],
      seResultsCount: null,
      coverage: "none",
      intent: "other",
    });
    expect(Number.isFinite(s.score)).toBe(true);
    expect(s.score).toBeLessThan(50);
  });
});
