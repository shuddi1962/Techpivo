/**
 * TechPivo Intelligence — SERP content-gap analyzer.
 *
 * Strictly separates DATA OBSERVATION (what the stored SERP shows) from
 * EDITORIAL INFERENCE (a hypothesis for the editor to verify). Never presents
 * an inferred gap as a proven fact.
 */
import type { SerpOrganicItem } from "@/lib/dataforseo";

export interface SerpGapInput {
  keyword: string;
  itemTypes: string[];
  organic: SerpOrganicItem[];
  seResultsCount: number | null;
}

export interface SerpGapFinding {
  gapType: string;
  observation: string;
  inference: string | null;
  priority: number; // 1..10
}

const norm = (t: string) => t.toLowerCase();

export function analyzeSerpGaps(input: SerpGapInput): SerpGapFinding[] {
  const findings: SerpGapFinding[] = [];
  const types = input.itemTypes.map(norm);
  const organic = input.organic ?? [];
  const has = (...needles: string[]) => needles.some((n) => types.some((t) => t.includes(n)));

  // 1. Forum / discussion dominated SERP (observable composition)
  const forumCount = organic.filter((o) =>
    /reddit\.|quora\.|stackoverflow|stackexchange|forum|community|discuss/i.test(o.domain + " " + o.url)
  ).length;
  if (forumCount >= 2 || has("discussions", "forums", "reddit")) {
    findings.push({
      gapType: "forum_dominated",
      observation: `${forumCount} of the top ${organic.length} results are forum/discussion threads${has("people_also_ask", "questions") ? ", and the SERP shows Q&A features" : ""}.`,
      inference: "Hypothesis (verify): an original tested guide with steps, screenshots and current data could add value beyond threads. Check the actual threads before deciding.",
      priority: 8,
    });
  }

  // 2. Missing video where how-to intent is likely
  const kw = input.keyword.toLowerCase();
  const howToish = /how|tutorial|guide|fix|setup|install|vs|review|best/i.test(kw);
  if (howToish && !has("video")) {
    findings.push({
      gapType: "missing_video",
      observation: `No video results in the SERP item types for a how-to style query ("${input.keyword}").`,
      inference: "Hypothesis (verify): screenshots or a short demo video could differentiate TechPivo coverage. Confirm intent by opening the top results.",
      priority: 6,
    });
  }

  // 3. Comparison intent without comparison coverage signal
  if (/ vs |versus|compare|best |top \d|alternatives/i.test(kw) && !has("comparison")) {
    findings.push({
      gapType: "missing_comparison",
      observation: `Comparison-style query ("${input.keyword}") with no dedicated comparison SERP feature observed.`,
      inference: "Hypothesis (verify): a side-by-side table with real test data may be missing. Inspect top pages for existing tables first.",
      priority: 7,
    });
  }

  // 4. Single-domain dominance
  const domainCounts = new Map<string, number>();
  for (const o of organic) {
    const d = (o.domain || "").toLowerCase();
    if (d) domainCounts.set(d, (domainCounts.get(d) ?? 0) + 1);
  }
  const top = [...domainCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 3 && organic.length >= 5) {
    findings.push({
      gapType: "single_domain_dominance",
      observation: `${top[0]} holds ${top[1]} of the top ${organic.length} organic positions.`,
      inference: "Hypothesis (verify): one publisher dominates — a genuinely different angle (local data, benchmarks, community research) is required, not a rewrite.",
      priority: 7,
    });
  }

  // 5. Snippet opportunity (observable holder)
  const snippet = organic.find((o) => o.isFeaturedSnippet);
  if (snippet) {
    findings.push({
      gapType: "snippet_observed",
      observation: `A featured snippet is held by ${snippet.domain} ("${(snippet.title || "").slice(0, 80)}").`,
      inference: "Hypothesis (verify): a concise, directly-answering intro + FAQ structure could contest the snippet. Only pursue with original supporting content.",
      priority: 5,
    });
  }

  // 6. Thin result descriptions
  const thin = organic.filter((o) => !(o.description && o.description.trim().length >= 80)).length;
  if (organic.length >= 5 && thin >= Math.ceil(organic.length / 2)) {
    findings.push({
      gapType: "thin_descriptions",
      observation: `${thin} of ${organic.length} top results have missing or very short descriptions.`,
      inference: "Hypothesis (verify): result quality signals look weak — room for a comprehensive, well-structured page. Verify by reading the pages.",
      priority: 5,
    });
  }

  // 7. Low-competition long-tail signal
  if ((input.seResultsCount ?? 0) > 0 && (input.seResultsCount as number) < 100000) {
    findings.push({
      gapType: "narrow_field",
      observation: `Only ${(input.seResultsCount as number).toLocaleString()} results indexed for this query.`,
      inference: "Hypothesis (verify): narrow field — specific, original coverage may stand out faster. Confirm the volume justifies effort.",
      priority: 4,
    });
  }

  if (findings.length === 0) {
    findings.push({
      gapType: "no_clear_gap",
      observation: `Top ${organic.length} results look like a standard commercial/editorial mix with no dominant weakness signal.`,
      inference: null,
      priority: 2,
    });
  }

  return findings.sort((a, b) => b.priority - a.priority);
}
