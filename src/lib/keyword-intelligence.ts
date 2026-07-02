import { createClient } from "@/lib/supabase/admin"

export interface KeywordOpportunity {
  keyword: string
  search_volume: number
  competition: number
  intent: "informational" | "transactional" | "navigational" | "commercial"
  difficulty: number
  trending: boolean
  opportunity_score: number
  suggested_category: string
  existing_coverage: boolean
  gap_type?: "competitor_exclusive" | "our_exclusive" | "overlap" | "new"
}

export interface GapAnalysis {
  competitor_domain: string
  their_keywords: number
  our_keywords: number
  overlap: number
  their_exclusive: number
  our_exclusive: number
  opportunities: KeywordOpportunity[]
}

export function calculateOpportunityScore(
  searchVolume: number,
  competition: number,
  difficulty: number,
  trending: boolean,
  hasExistingCoverage: boolean
): number {
  // Search demand (0-100): normalized by 10000
  const demand = Math.min(100, Math.round(searchVolume / 100))

  // Competition inverse (0-100): lower competition = higher score
  const competitionScore = Math.round((1 - competition) * 100)

  // Difficulty inverse (0-100)
  const difficultyScore = Math.max(0, 100 - difficulty)

  // Trending bonus
  const trendingBonus = trending ? 20 : 0

  // Coverage penalty (avoid cannibalization)
  const coveragePenalty = hasExistingCoverage ? -30 : 0

  const score = Math.round(
    demand * 0.30 +
    competitionScore * 0.25 +
    difficultyScore * 0.25 +
    trendingBonus +
    coveragePenalty
  )

  return Math.min(100, Math.max(0, score))
}

export function classifyIntent(keyword: string): KeywordOpportunity["intent"] {
  const lower = keyword.toLowerCase()

  if (lower.startsWith("how to") || lower.startsWith("what is") || lower.startsWith("why") || lower.startsWith("guide")) {
    return "informational"
  }
  if (lower.startsWith("buy") || lower.startsWith("price") || lower.startsWith("cost") || lower.includes("deal") || lower.includes("discount")) {
    return "transactional"
  }
  if (lower.includes("login") || lower.includes("sign in") || lower.includes("official") || lower.includes("website")) {
    return "navigational"
  }
  if (lower.includes("best") || lower.includes("review") || lower.includes("vs") || lower.includes("comparison") || lower.includes("top")) {
    return "commercial"
  }

  return "informational"
}

export async function getKeywordStats() {
  const supabase = createClient()

  const { data: analyticsEvents } = await supabase
    .from("analytics_events")
    .select("page_url, referrer")
    .eq("event_type", "page_view")
    .limit(1000)

  const { count: totalPosts } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("status", "published")

  const { count: draftPosts } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("status", "draft")

  return {
    totalPublished: totalPosts || 0,
    totalDrafts: draftPosts || 0,
    totalKeywords: 0,
    trendingKeywords: 0,
  }
}
