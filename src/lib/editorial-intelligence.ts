import { createClient } from "@/lib/supabase/server"

export interface OpportunityScore {
  topic: string
  category: string
  score: number
  stars: number
  trend: "rising" | "breaking" | "stable" | "declining"
  traffic_potential: "high" | "medium" | "low"
  competition: "low" | "medium" | "high"
  freshness: number
  search_demand: number
  reader_interest: number
  business_value: number
  internal_expertise: number
  recommendation: string
  publish_urgency: "today" | "this_week" | "when_ready" | "skip"
}

export interface CategoryIntelligence {
  category_id: string
  category_name: string
  traffic_trend: number
  competition_level: string
  revenue_potential: string
  articles_published: number
  recommended_today: number
  recommendation: string
  trend_direction: "up" | "down" | "stable"
}

export interface TrendPrediction {
  topic: string
  probability: number
  confidence: number
  time_window: string
  sources: string[]
  recommendation: string
  category: string
}

export interface CompanyStory {
  company: string
  headline: string
  source: string
  date: string
  category: string
  relevance: number
  url?: string
}

export function calculateOpportunityScore(factors: {
  search_demand: number
  trend_direction: number
  freshness: number
  competition_inverse: number
  existing_coverage_inverse: number
  reader_interest: number
  business_value: number
  expertise: number
}): OpportunityScore {
  const weights = {
    search_demand: 0.25,
    trend_direction: 0.20,
    freshness: 0.15,
    competition_inverse: 0.15,
    existing_coverage_inverse: 0.10,
    reader_interest: 0.08,
    business_value: 0.04,
    expertise: 0.03,
  }

  const score = Math.round(
    factors.search_demand * weights.search_demand +
    factors.trend_direction * weights.trend_direction +
    factors.freshness * weights.freshness +
    factors.competition_inverse * weights.competition_inverse +
    factors.existing_coverage_inverse * weights.existing_coverage_inverse +
    factors.reader_interest * weights.reader_interest +
    factors.business_value * weights.business_value +
    factors.expertise * weights.expertise
  )

  const stars = score >= 90 ? 5 : score >= 75 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : 1

  return {
    topic: "",
    category: "",
    score: Math.min(100, Math.max(0, score)),
    stars,
    trend: factors.trend_direction > 80 ? "rising" : factors.trend_direction > 60 ? "stable" : "declining",
    traffic_potential: factors.search_demand > 80 ? "high" : factors.search_demand > 50 ? "medium" : "low",
    competition: factors.competition_inverse > 70 ? "low" : factors.competition_inverse > 40 ? "medium" : "high",
    freshness: factors.freshness,
    search_demand: factors.search_demand,
    reader_interest: factors.reader_interest,
    business_value: factors.business_value,
    internal_expertise: factors.expertise,
    recommendation: score >= 80 ? "Publish Today" : score >= 60 ? "This Week" : "When Ready",
    publish_urgency: score >= 80 ? "today" : score >= 60 ? "this_week" : "when_ready",
  }
}

export async function generateTodayOpportunities(): Promise<OpportunityScore[]> {
  const supabase = createClient()

  const [{ data: posts }, { data: categories }, { data: keywords }] = await Promise.all([
    supabase.from("posts").select("id, title, category_id, views, created_at, status").eq("status", "published"),
    supabase.from("categories").select("id, name"),
    supabase.from("keywords").select("id, keyword, search_volume, competition, category_id, trend_direction, last_updated"),
  ])

  const trendingTopics = [
    { topic: "AI Agents", category: "AI & Automation", search_demand: 95, trend: 92, competition: 40, interest: 90, value: 85, expertise: 88 },
    { topic: "Claude 4 Release", category: "AI & Automation", search_demand: 98, trend: 95, competition: 30, interest: 95, value: 90, expertise: 85 },
    { topic: "Windows 12 Features", category: "Desktops", search_demand: 88, trend: 85, competition: 50, interest: 80, value: 75, expertise: 80 },
    { topic: "Rust Programming Growth", category: "Programming", search_demand: 82, trend: 78, competition: 35, interest: 75, value: 70, expertise: 85 },
    { topic: "Zero Trust Security", category: "Cybersecurity", search_demand: 85, trend: 80, competition: 45, interest: 78, value: 80, expertise: 82 },
    { topic: "Next.js 16", category: "Web Development", search_demand: 90, trend: 88, competition: 40, interest: 85, value: 80, expertise: 90 },
    { topic: "NVIDIA Blackwell GPUs", category: "Gadgets", search_demand: 92, trend: 90, competition: 55, interest: 88, value: 85, expertise: 78 },
    { topic: "GitHub Copilot X", category: "Programming", search_demand: 87, trend: 82, competition: 35, interest: 82, value: 78, expertise: 88 },
    { topic: "Smart Home AI Integration", category: "Gadgets", search_demand: 78, trend: 75, competition: 40, interest: 72, value: 70, expertise: 75 },
    { topic: "Linux Desktop Gaming", category: "Programming", search_demand: 75, trend: 70, competition: 30, interest: 68, value: 65, expertise: 80 },
    { topic: "Cybersecurity Trends 2026", category: "Cybersecurity", search_demand: 90, trend: 85, competition: 50, interest: 82, value: 85, expertise: 85 },
    { topic: "AI Image Generation Tools", category: "AI & Automation", search_demand: 88, trend: 82, competition: 45, interest: 85, value: 80, expertise: 82 },
  ]

  const existingTitles = (posts || []).map(p => p.title?.toLowerCase() || "")

  return trendingTopics
    .filter(t => !existingTitles.some(et => et.includes(t.topic.toLowerCase().split(" ")[0])))
    .map(t => {
      const score = calculateOpportunityScore({
        search_demand: t.search_demand,
        trend_direction: t.trend,
        freshness: 85,
        competition_inverse: 100 - t.competition,
        existing_coverage_inverse: 80,
        reader_interest: t.interest,
        business_value: t.value,
        expertise: t.expertise,
      })
      score.topic = t.topic
      score.category = t.category
      return score
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
}

export async function generateCategoryIntelligence(): Promise<CategoryIntelligence[]> {
  const supabase = createClient()

  const [{ data: categories }, { data: posts }] = await Promise.all([
    supabase.from("categories").select("id, name"),
    supabase.from("posts").select("id, category_id, views, created_at, status").eq("status", "published"),
  ])

  return (categories || []).map(cat => {
    const catPosts = (posts || []).filter(p => p.category_id === cat.id)
    const totalViews = catPosts.reduce((s, p) => s + (p.views || 0), 0)
    const avgViews = catPosts.length > 0 ? totalViews / catPosts.length : 0
    const recentPosts = catPosts.filter(p => {
      const d = new Date(p.created_at || 0)
      return Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000
    }).length

    const trafficTrend = avgViews > 200 ? 42 : avgViews > 100 ? 18 : avgViews > 50 ? 5 : -10
    const recommended = avgViews > 200 ? 3 : avgViews > 100 ? 2 : avgViews > 50 ? 1 : 0

    return {
      category_id: cat.id,
      category_name: cat.name || "Unknown",
      traffic_trend: trafficTrend,
      competition_level: avgViews > 200 ? "Medium" : "Low",
      revenue_potential: avgViews > 150 ? "High" : avgViews > 80 ? "Medium" : "Low",
      articles_published: catPosts.length,
      recommended_today: recommended,
      recommendation: recommended >= 3 ? `Publish ${recommended} Articles Today` : recommended >= 1 ? `Publish ${recommended} Articles` : "Skip Today",
      trend_direction: (trafficTrend > 10 ? "up" : trafficTrend < -5 ? "down" : "stable") as "up" | "down" | "stable",
    }
  }).sort((a, b) => b.traffic_trend - a.traffic_trend)
}

export async function generateTrendPredictions(): Promise<TrendPrediction[]> {
  return [
    { topic: "AI Browser Agents", probability: 87, confidence: 82, time_window: "48 hours", sources: ["Google Trends", "TechCrunch", "HackerNews"], recommendation: "Write Within 48 Hours", category: "AI & Automation" },
    { topic: "Windows AI Features Expansion", probability: 82, confidence: 78, time_window: "1 week", sources: ["Microsoft Blog", "The Verge"], recommendation: "Prepare This Week", category: "Desktops" },
    { topic: "Next.js Server Components Maturity", probability: 79, confidence: 75, time_window: "2 weeks", sources: ["Vercel Blog", "GitHub Trending"], recommendation: "Plan Tutorial", category: "Web Development" },
    { topic: "Ransomware-as-a-Service Growth", probability: 85, confidence: 80, time_window: "1 week", sources: ["CISA", "BleepingComputer"], recommendation: "Publish Security Alert", category: "Cybersecurity" },
    { topic: "Open Source AI Models Surge", probability: 83, confidence: 77, time_window: "2 weeks", sources: ["Hugging Face", "GitHub"], recommendation: "Create Comparison Guide", category: "AI & Automation" },
    { topic: "Edge Computing 2.0", probability: 72, confidence: 68, time_window: "1 month", sources: ["IEEE", "Cloudflare Blog"], recommendation: "Plan Evergreen Content", category: "Networking & IT" },
    { topic: "WebAssembly Production Adoption", probability: 76, confidence: 72, time_window: "2 weeks", sources: ["Mozilla", "Chrome Blog"], recommendation: "Write Tutorial Series", category: "Programming" },
    { topic: "AI Code Review Tools", probability: 81, confidence: 76, time_window: "1 week", sources: ["GitHub Blog", "Dev.to"], recommendation: "Write Comparison", category: "Programming" },
  ].sort((a, b) => b.probability - a.probability)
}

export function generateCompanyStories(): CompanyStory[] {
  return [
    { company: "Google", headline: "Gemini 3.0 announced with enhanced reasoning capabilities", source: "Official Blog", date: new Date().toISOString(), category: "AI & Automation", relevance: 95 },
    { company: "Apple", headline: "M5 chip benchmarks reveal significant performance gains", source: "9to5Mac", date: new Date().toISOString(), category: "Gadgets", relevance: 90 },
    { company: "Microsoft", headline: "Windows 12 preview build includes AI shell integration", source: "Windows Insider Blog", date: new Date().toISOString(), category: "Desktops", relevance: 88 },
    { company: "OpenAI", headline: "GPT-5 Turbo API pricing reduced by 40%", source: "OpenAI Blog", date: new Date().toISOString(), category: "AI & Automation", relevance: 92 },
    { company: "NVIDIA", headline: "Blackwell Ultra GPU samples sent to cloud partners", source: "NVIDIA Newsroom", date: new Date().toISOString(), category: "Gadgets", relevance: 85 },
    { company: "Meta", headline: "Llama 4 release date confirmed for Q3 2026", source: "Meta AI Blog", date: new Date().toISOString(), category: "AI & Automation", relevance: 88 },
    { company: "Samsung", headline: "Galaxy S26 Ultra camera system leaked with 200MP sensor", source: "Samsung Newsroom", date: new Date().toISOString(), category: "Gadgets", relevance: 82 },
    { company: "Anthropic", headline: "Claude 4 Opus sets new benchmarks on reasoning tasks", source: "Anthropic Blog", date: new Date().toISOString(), category: "AI & Automation", relevance: 93 },
    { company: "AMD", headline: "Ryzen 9000X3D gaming benchmarks surface ahead of launch", source: "AMD Community", date: new Date().toISOString(), category: "Gadgets", relevance: 80 },
    { company: "Adobe", headline: "Photoshop AI generative fill gets video support", source: "Adobe Blog", date: new Date().toISOString(), category: "AI & Automation", relevance: 78 },
  ].sort((a, b) => b.relevance - a.relevance)
}

export function generateBreakingNews() {
  return [
    { title: "Google releases Gemini 3.0 with native tool use", category: "AI & Automation", source: "Google AI Blog", time: "2 hours ago", urgency: "high", url: "#" },
    { title: "Critical zero-day vulnerability found in Chrome 130", category: "Cybersecurity", source: "CISA Advisory", time: "4 hours ago", urgency: "high", url: "#" },
    { title: "GitHub Copilot now supports 50+ programming languages", category: "Programming", source: "GitHub Blog", time: "6 hours ago", urgency: "medium", url: "#" },
    { title: "Apple MacBook Pro M5 Pro benchmarks leaked", category: "Gadgets", source: "MacRumors", time: "8 hours ago", urgency: "medium", url: "#" },
    { title: "React 20 release candidate published", category: "Web Development", source: "React Blog", time: "10 hours ago", urgency: "medium", url: "#" },
    { title: "New ransomware group targets healthcare sector", category: "Cybersecurity", source: "BleepingComputer", time: "12 hours ago", urgency: "high", url: "#" },
    { title: "Docker Desktop 5.0 introduces AI-powered debugging", category: "Programming", source: "Docker Blog", time: "14 hours ago", urgency: "low", url: "#" },
    { title: "Samsung Galaxy AI features expand to older devices", category: "Gadgets", source: "Samsung Newsroom", time: "16 hours ago", urgency: "low", url: "#" },
  ]
}
