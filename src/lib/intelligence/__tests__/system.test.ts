import { describe, it, expect } from "vitest";
import { classifyOpportunityTypes } from "@/lib/intelligence/opp-types";
import { classifyLocalIntent } from "@/lib/intelligence/local-intent";
import { buildSocialDrafts } from "@/lib/intelligence/social";
import { depthCaps } from "@/lib/intelligence/discovery";

describe("classifyOpportunityTypes", () => {
  it("tags trending + low-competition from stored signals", () => {
    const t = classifyOpportunityTypes({
      trendDirection: "breakout", keywordDifficulty: 20, searchVolume: 5000,
      coverage: "none", serpItemTypes: ["organic"], intent: "commercial",
    });
    expect(t).toContain("trending");
    expect(t).toContain("low_competition");
    expect(t).toContain("content_gap");
  });

  it("tags serp_gap on forum-heavy SERPs and local on geo scope", () => {
    const t = classifyOpportunityTypes({
      serpItemTypes: ["organic", "discussions"], intent: "how_to",
      localIntent: "country", communityDemand: 5, aiSearchVolume: 200,
    });
    expect(t).toContain("serp_gap");
    expect(t).toContain("how_to");
    expect(t).toContain("local");
    expect(t).toContain("community");
    expect(t).toContain("ai_search");
  });

  it("returns empty for a bare signal set (no invention)", () => {
    expect(classifyOpportunityTypes({})).toEqual([]);
  });
});

describe("classifyLocalIntent", () => {
  it("detects city and country signals", () => {
    expect(classifyLocalIntent("computer repair Port Harcourt").scope).toBe("city");
    expect(classifyLocalIntent("best AI tools Nigeria").scope).toBe("country");
  });

  it("marks plain queries non_local and flags heuristic", () => {
    const r = classifyLocalIntent("best AI coding tools");
    expect(r.scope).toBe("non_local");
    expect(r.heuristic).toBe(true);
  });
});

describe("buildSocialDrafts", () => {
  it("builds drafts from evidence without inventing stats", () => {
    const d = buildSocialDrafts({ keyword: "AI coding tools", gapSummary: "Forums dominate the SERP." });
    expect(d.hook).toMatch(/AI coding tools/);
    expect(d.short_video_script).toHaveLength(4);
    expect(JSON.stringify(d)).not.toMatch(/\d{4,}/);
  });
});

describe("depthCaps", () => {
  it("keeps spend predictable across depths", () => {
    expect(depthCaps("broad")).toEqual({ seeds: 4, markets: 2, suggestionsPerSeed: 10 });
    const deep = depthCaps("deep");
    expect(deep.seeds * deep.markets).toBeLessThanOrEqual(40);
  });
});
