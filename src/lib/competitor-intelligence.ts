export interface CompetitorProfile {
  domain: string
  name: string
  estimated_authority: number
  publishing_frequency: string
  primary_categories: string[]
  strengths: string[]
  weaknesses: string[]
}

export const KNOWN_COMPETITORS: CompetitorProfile[] = [
  {
    domain: "theverge.com",
    name: "The Verge",
    estimated_authority: 92,
    publishing_frequency: "Very High (50+ articles/day)",
    primary_categories: ["tech-news", "reviews", "gadgets"],
    strengths: ["Brand recognition", "Video content", "Breaking news speed"],
    weaknesses: ["Broad focus", "Less developer content"],
  },
  {
    domain: "arstechnica.com",
    name: "Ars Technica",
    estimated_authority: 89,
    publishing_frequency: "High (20+ articles/day)",
    primary_categories: ["tech-news", "programming", "cybersecurity"],
    strengths: ["Deep technical analysis", "Expert writers", "Long-form content"],
    weaknesses: ["Slower breaking news", "Denser writing style"],
  },
  {
    domain: "techcrunch.com",
    name: "TechCrunch",
    estimated_authority: 91,
    publishing_frequency: "Very High (40+ articles/day)",
    primary_categories: ["tech-news", "digital-business", "ai-automation"],
    strengths: ["Startup coverage", "Event coverage", "Industry connections"],
    weaknesses: ["Paywall", "Less tutorials", "Less developer focus"],
  },
  {
    domain: "howtogeek.com",
    name: "How-To Geek",
    estimated_authority: 85,
    publishing_frequency: "High (15+ articles/day)",
    primary_categories: ["tutorials", "gadgets", "desktops"],
    strengths: ["Tutorial depth", "Beginner-friendly", "SEO optimization"],
    weaknesses: ["Less cutting-edge", "Consumer focus"],
  },
  {
    domain: "zdnet.com",
    name: "ZDNet",
    estimated_authority: 88,
    publishing_frequency: "High (20+ articles/day)",
    primary_categories: ["tech-news", "digital-business", "cybersecurity"],
    strengths: ["Enterprise focus", "Analysis", "Industry reports"],
    weaknesses: ["Corporate tone", "Less developer content"],
  },
  {
    domain: "wired.com",
    name: "WIRED",
    estimated_authority: 90,
    publishing_frequency: "Medium (10+ articles/day)",
    primary_categories: ["tech-news", "ai-automation", "cybersecurity"],
    strengths: ["Long-form journalism", "Cultural context", "Brand prestige"],
    weaknesses: ["Less technical", "Slower publishing"],
  },
]

export function getCompetitorSummary(domain: string): CompetitorProfile | undefined {
  return KNOWN_COMPETITORS.find(c => c.domain === domain)
}

export function identifyContentGaps(
  ourCategories: string[],
  competitor: CompetitorProfile
): string[] {
  const gaps: string[] = []

  for (const category of competitor.primary_categories) {
    if (!ourCategories.includes(category)) {
      gaps.push(category)
    }
  }

  return gaps
}
