import { calculateReadability, calculateSeoScore } from "./seo-utils"
import type { EditorPostState } from "@/types/editor"

export interface QualityBreakdown {
  readability: number
  seo: number
  sources: number
  factualVerification: number
  originality: number
}

export interface QualityResult {
  overall: number
  breakdown: QualityBreakdown
  tier: "excellent" | "good" | "acceptable" | "needs_work" | "poor"
  blockers: string[]
  recommendations: string[]
}

const BANNED_AI_PHRASES = [
  "in today's fast-paced", "it goes without saying", "at the end of the day",
  "game-changing", "revolutionary technology", "leveraging synergies",
  "deep dive", "delve into", "paradigm shift", "in conclusion",
  "to summarize", "furthermore", "moreover", "additionally",
  "it's worth noting", "cutting-edge", "state-of-the-art",
  "holistic approach", "moving forward", "this article will explore",
]

export function calculateQualityScore(
  content: string,
  keyword: string,
  state: EditorPostState,
  sourceCount: number = 0,
  factCheckPassRate: number = 1.0,
  existingContentSimilarity: number = 0
): QualityResult {
  const blockers: string[] = []
  const recommendations: string[] = []

  // Readability (20%)
  const { score: readabilityScore } = calculateReadability(content)

  // SEO (20%)
  const { score: seoScore } = calculateSeoScore(keyword, state)

  // Sources (20%)
  let sourcesScore = 0
  if (sourceCount >= 5) sourcesScore = 100
  else if (sourceCount >= 3) sourcesScore = 85
  else if (sourceCount >= 1) sourcesScore = 70
  else { sourcesScore = 40; recommendations.push("Add at least 3 credible sources") }

  // Factual verification (25%)
  const factualScore = Math.round(factCheckPassRate * 100)
  if (factCheckPassRate < 0.8) {
    blockers.push("Fact check pass rate below 80% — review flagged claims")
  }

  // Originality (15%)
  let originalityScore = 100
  if (existingContentSimilarity > 0.5) {
    originalityScore = 0
    blockers.push("Content too similar to existing articles — rewrite required")
  } else if (existingContentSimilarity > 0.3) {
    originalityScore = 60
    recommendations.push("Reduce similarity to existing content")
  } else if (existingContentSimilarity > 0.15) {
    originalityScore = 80
  }

  // AI phrase detection
  const plainContent = content.replace(/<[^>]*>/g, "").toLowerCase()
  const foundPhrases = BANNED_AI_PHRASES.filter(p => plainContent.includes(p))
  if (foundPhrases.length > 0) {
    recommendations.push(`Remove ${foundPhrases.length} AI cliché phrase(s): ${foundPhrases.slice(0, 3).join(", ")}`)
  }

  // Weighted overall
  const overall = Math.round(
    readabilityScore * 0.20 +
    seoScore * 0.20 +
    sourcesScore * 0.20 +
    factualScore * 0.25 +
    originalityScore * 0.15
  )

  let tier: QualityResult["tier"]
  if (overall >= 90) tier = "excellent"
  else if (overall >= 80) tier = "good"
  else if (overall >= 70) tier = "acceptable"
  else if (overall >= 60) tier = "needs_work"
  else tier = "poor"

  if (tier === "poor") {
    blockers.push("Quality score below 60 — publication blocked")
  }

  return {
    overall,
    breakdown: {
      readability: readabilityScore,
      seo: seoScore,
      sources: sourcesScore,
      factualVerification: factualScore,
      originality: originalityScore,
    },
    tier,
    blockers,
    recommendations,
  }
}

export function getTierColor(tier: QualityResult["tier"]): string {
  switch (tier) {
    case "excellent": return "#10B981"
    case "good": return "#3B82F6"
    case "acceptable": return "#F59E0B"
    case "needs_work": return "#F97316"
    case "poor": return "#EF4444"
  }
}

export function getTierLabel(tier: QualityResult["tier"]): string {
  switch (tier) {
    case "excellent": return "Excellent"
    case "good": return "Good"
    case "acceptable": return "Acceptable"
    case "needs_work": return "Needs Work"
    case "poor": return "Poor"
  }
}
