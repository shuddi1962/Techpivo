import { describe, it, expect } from "vitest";
import { classifyTrend } from "@/lib/intelligence/trends";
import { analyzeSerpGaps } from "@/lib/intelligence/serp-gaps";
import { assessOriginality } from "@/lib/intelligence/originality";

describe("classifyTrend", () => {
  it("requires at least 2 measured snapshots", () => {
    const r = classifyTrend("kw", 2840, "en", [
      { fetchedAt: "2026-09-01T00:00:00Z", searchVolume: 100, trendMonthly: null, trendYearly: null },
    ]);
    expect(r.direction).toBe("insufficient_data");
    expect(r.changePct).toBeNull();
  });

  it("detects breakout growth with real numbers", () => {
    const r = classifyTrend("kw", 2840, "en", [
      { fetchedAt: "2026-07-01T00:00:00Z", searchVolume: 1000, trendMonthly: 5, trendYearly: 10 },
      { fetchedAt: "2026-09-01T00:00:00Z", searchVolume: 1800, trendMonthly: 25, trendYearly: 60 },
    ]);
    expect(r.direction).toBe("breakout");
    expect(r.changePct).toBe(80);
    expect(r.evidence.join(" ")).toMatch(/1,000 → 1,800/);
  });

  it("detects declining demand", () => {
    const r = classifyTrend("kw", 2840, "en", [
      { fetchedAt: "2026-07-01T00:00:00Z", searchVolume: 5000, trendMonthly: null, trendYearly: null },
      { fetchedAt: "2026-09-01T00:00:00Z", searchVolume: 3000, trendMonthly: -20, trendYearly: -30 },
    ]);
    expect(r.direction).toBe("declining");
    expect(r.changePct).toBe(-40);
  });

  it("flags emerging demand from zero", () => {
    const r = classifyTrend("kw", 2840, "en", [
      { fetchedAt: "2026-07-01T00:00:00Z", searchVolume: 0, trendMonthly: null, trendYearly: null },
      { fetchedAt: "2026-09-01T00:00:00Z", searchVolume: 400, trendMonthly: null, trendYearly: null },
    ]);
    expect(r.direction).toBe("emerging");
  });
});

describe("analyzeSerpGaps", () => {
  const base = {
    keyword: "best AI coding tools",
    seResultsCount: 50000,
    organic: [
      { position: 1, title: "Best tools", url: "https://www.reddit.com/r/x", domain: "reddit.com", description: "thread", isFeaturedSnippet: false },
      { position: 2, title: "Tools thread", url: "https://forum.example.com/t", domain: "forum.example.com", description: "x", isFeaturedSnippet: false },
      { position: 3, title: "Guide", url: "https://example.com/g", domain: "example.com", description: "A sufficiently long description that passes the thin check easily here.", isFeaturedSnippet: true },
    ],
  };

  it("observes forum dominance and separates inference", () => {
    const f = analyzeSerpGaps({ ...base, itemTypes: ["organic", "discussions", "people_also_ask"] });
    const forum = f.find((x) => x.gapType === "forum_dominated");
    expect(forum).toBeDefined();
    expect(forum!.observation).toMatch(/2 of the top 3/);
    expect(forum!.inference ?? "").toMatch(/Hypothesis/);
    const snippet = f.find((x) => x.gapType === "snippet_observed");
    expect(snippet?.observation).toMatch(/example\.com/);
  });

  it("returns no_clear_gap for a standard mix without inventing gaps", () => {
    const f = analyzeSerpGaps({
      keyword: "laptop",
      itemTypes: ["organic"],
      seResultsCount: 500000000,
      organic: Array.from({ length: 6 }, (_, i) => ({
        position: i + 1,
        title: `Result ${i}`,
        url: `https://site${i}.com/a`,
        domain: `site${i}.com`,
        description: "A long and descriptive snippet text that is clearly not thin at all here, with plenty of detail.",
        isFeaturedSnippet: false,
      })),
    });
    expect(f.map((x) => x.gapType)).toContain("no_clear_gap");
  });
});

describe("assessOriginality", () => {
  it("rejects rewrite-only plans", () => {
    const a = assessOriginality([]);
    expect(a.verdict).toBe("insufficient");
    expect(a.recommendations.join(" ")).toMatch(/INSUFFICIENT ORIGINAL VALUE/);
  });

  it("passes plans with strong evidence", () => {
    const a = assessOriginality(["original_testing", "original_screenshots"]);
    expect(a.verdict).toBe("sufficient");
    expect(a.matched).toHaveLength(2);
  });

  it("ignores unknown evidence types", () => {
    const a = assessOriginality(["rewrite_competitors", "ai_paraphrase"]);
    expect(a.verdict).toBe("insufficient");
    expect(a.matched).toHaveLength(0);
  });
});
