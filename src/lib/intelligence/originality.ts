/**
 * TechPivo Intelligence — mandatory originality gate.
 *
 * An opportunity becomes publishable only when the editorial plan includes
 * real original evidence. A plan that is just "rewrite these pages" fails
 * with INSUFFICIENT ORIGINAL VALUE plus concrete recommendations.
 */

export interface OriginalityEvidence {
  type: string;
  label: string;
  detail: string;
}

export const ORIGINALITY_EVIDENCE_TYPES = [
  { type: "original_testing", label: "Original testing", weight: 25 },
  { type: "original_benchmark", label: "Original benchmark", weight: 25 },
  { type: "original_screenshots", label: "Original screenshots", weight: 10 },
  { type: "original_experiment", label: "Original experiment", weight: 25 },
  { type: "original_interview", label: "Original interview", weight: 20 },
  { type: "original_survey", label: "Original survey / community responses", weight: 20 },
  { type: "original_data_analysis", label: "Original data analysis", weight: 20 },
  { type: "original_case_study", label: "Original case study", weight: 20 },
  { type: "hands_on_review", label: "Hands-on review", weight: 20 },
  { type: "original_code_test", label: "Original code / reproduction", weight: 20 },
  { type: "official_docs_synthesis", label: "Official docs + TechPivo analysis", weight: 10 },
  { type: "multi_source_synthesis", label: "Multiple verified sources + synthesis", weight: 10 },
] as const;

export type OriginalityVerdict = "sufficient" | "insufficient";

export interface OriginalityAssessment {
  score: number; // 0-100
  verdict: OriginalityVerdict;
  matched: string[];
  recommendations: string[];
}

const STRONG = new Set([
  "original_testing",
  "original_benchmark",
  "original_experiment",
  "original_data_analysis",
  "hands_on_review",
  "original_case_study",
]);

/** Pure + deterministic (unit-tested). */
export function assessOriginality(selectedTypes: string[]): OriginalityAssessment {
  const known = ORIGINALITY_EVIDENCE_TYPES.filter((e) =>
    selectedTypes.includes(e.type)
  );
  const matched = known.map((e) => e.type);
  const score = Math.min(
    100,
    known.reduce((sum, e) => sum + e.weight, 0)
  );
  const strongCount = matched.filter((t) => STRONG.has(t)).length;
  // Sufficient = at least 2 evidence types with at least 1 strong, or score >= 40.
  const verdict: OriginalityVerdict =
    (matched.length >= 2 && strongCount >= 1) || score >= 40
      ? "sufficient"
      : "insufficient";

  const recommendations: string[] =
    verdict === "sufficient"
      ? ["Originality requirement met — record the evidence in the research workspace as it is produced."]
      : [
          "INSUFFICIENT ORIGINAL VALUE — do not publish a rewrite. Add original value first:",
          ...missingRecommendations(matched),
        ];

  return { score, verdict, matched, recommendations };
}

function missingRecommendations(matched: string[]): string[] {
  const out: string[] = [];
  const has = (t: string) => matched.includes(t);
  if (!has("original_testing") && !has("hands_on_review") && !has("original_experiment")) {
    out.push("Run a hands-on test or reproducible experiment and publish the method + results.");
  }
  if (!has("original_screenshots") && !has("original_benchmark") && !has("original_code_test")) {
    out.push("Create original screenshots, benchmarks, or tested code samples.");
  }
  if (!has("original_survey") && !has("original_interview")) {
    out.push("Collect community responses or an interview to add first-hand evidence.");
  }
  if (!has("original_data_analysis") && !has("original_case_study")) {
    out.push("Analyze public data or document a real case study with numbers.");
  }
  if (out.length === 0) {
    out.push("Add at least one strong evidence type (testing, benchmark, experiment, hands-on review).");
  }
  return out;
}

export function isKnownEvidenceType(t: string): boolean {
  return ORIGINALITY_EVIDENCE_TYPES.some((e) => e.type === t);
}
