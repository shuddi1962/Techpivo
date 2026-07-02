import { createClient } from "@/lib/supabase/admin"

export interface StoryCluster {
  id: string
  topic: string
  companies: string[]
  products: string[]
  people: string[]
  item_count: number
  avg_credibility: number
  first_seen_at: string
  latest_at: string
  article_id: string | null
  status: "new" | "being_covered" | "covered" | "dismissed"
}

export interface WorthCoveringScore {
  score: number
  breakdown: {
    sourceCredibility: number
    freshness: number
    entitySignificance: number
    searchVolumePotential: number
    competitiveAdvantage: number
  }
}

export function calculateWorthCoveringScore(
  avgCredibilityTier: number,
  hoursSinceFirst: number,
  entityCount: number,
  estimatedSearchVolume: number,
  hasExistingCoverage: boolean
): WorthCoveringScore {
  // Source Credibility (0-100): Tier 1 = 100, Tier 5 = 20
  const sourceCredibility = Math.max(0, 100 - (avgCredibilityTier - 1) * 20)

  // Freshness (0-100): 0-4h = 100, 4-12h = 75, 12-24h = 50, 24h+ = 25
  let freshness: number
  if (hoursSinceFirst <= 4) freshness = 100
  else if (hoursSinceFirst <= 12) freshness = 75
  else if (hoursSinceFirst <= 24) freshness = 50
  else freshness = 25

  // Entity Significance (0-100): more entities = higher score
  const entitySignificance = Math.min(100, entityCount * 20)

  // Search Volume Potential (0-100)
  const searchVolumePotential = Math.min(100, Math.round(estimatedSearchVolume / 100))

  // Competitive Advantage (0-100): no existing coverage = higher advantage
  const competitiveAdvantage = hasExistingCoverage ? 40 : 90

  const score = Math.round(
    sourceCredibility * 0.25 +
    freshness * 0.20 +
    entitySignificance * 0.15 +
    searchVolumePotential * 0.20 +
    competitiveAdvantage * 0.20
  )

  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown: {
      sourceCredibility,
      freshness,
      entitySignificance,
      searchVolumePotential,
      competitiveAdvantage,
    },
  }
}

export async function getRssIntelligenceStats() {
  const supabase = createClient()

  const [
    { count: totalFeeds },
    { count: activeFeeds },
    { count: totalItems },
    { data: recentFeeds },
  ] = await Promise.all([
    supabase.from("rss_feeds").select("*", { count: "exact", head: true }),
    supabase.from("rss_feeds").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("rss_feeds").select("posts_fetched"),
    supabase.from("rss_feeds").select("id, feed_name, last_fetched_at, is_active, posts_fetched, last_error").order("last_fetched_at", { ascending: false }).limit(20),
  ])

  const totalPostsFetched = (recentFeeds || []).reduce((sum: number, f: any) => sum + (f.posts_fetched || 0), 0)
  const failedFeeds = (recentFeeds || []).filter((f: any) => f.last_error).length

  return {
    totalFeeds: totalFeeds || 0,
    activeFeeds: activeFeeds || 0,
    totalPostsFetched,
    failedFeeds,
    feeds: recentFeeds || [],
  }
}

export function extractEntities(text: string): {
  companies: string[]
  products: string[]
  people: string[]
  technologies: string[]
} {
  const knownCompanies = [
    "Google", "Apple", "Microsoft", "Amazon", "Meta", "OpenAI", "Anthropic",
    "NVIDIA", "Samsung", "AMD", "Intel", "Adobe", "Cisco", "Oracle", "GitHub",
    "Tesla", "SpaceX", "Netflix", "Spotify", "Twitter", "X", "ByteDance",
    "TikTok", "Uber", "Airbnb", "Stripe", "Shopify", "Slack", "Zoom",
  ]

  const knownTech = [
    "React", "Next.js", "Node.js", "Python", "TypeScript", "JavaScript",
    "GPT-4", "GPT-5", "Gemini", "Claude", "Llama", "Mistral",
    "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Supabase",
    "PostgreSQL", "MongoDB", "Redis", "GraphQL", "REST API",
    "Machine Learning", "Deep Learning", "Neural Network", "LLM",
    "HTML", "CSS", "Tailwind", "Vue.js", "Angular", "Svelte",
  ]

  const companies = knownCompanies.filter(c => text.includes(c))
  const technologies = knownTech.filter(t => text.includes(t))

  // Simple person detection (capitalized name patterns)
  const personPattern = /\b([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/g
  const personMatches = text.match(personPattern) || []
  const people = [...new Set(personMatches)].slice(0, 10)

  return {
    companies,
    products: technologies,
    people,
    technologies,
  }
}
