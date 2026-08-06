import { createClient } from "@/lib/supabase/admin"

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

export interface ContentGap {
  topic: string
  category: string
  search_volume: number
  competition_level: string
  competitor_coverage: string[]
  gap_type: string
  priority: number
}

export interface CompetitorData {
  name: string
  website: string
  category_focus: string[]
  publishing_frequency: string
  trending_topics: string[]
  estimated_da: number
  overlap_score: number
}

export interface ProductLaunch {
  company: string
  product_name: string
  product_type: string
  launch_date: string
  status: string
  article_ideas: string[]
}

export interface EditorialQueueItem {
  id: string
  title: string
  category: string
  stage: string
  priority: number
  created_at: string
}

export interface ArticlePlan {
  title: string
  seo_title: string
  slug: string
  meta_description: string
  outline: { heading: string; points: string[] }[]
  faqs: { question: string; answer: string }[]
  primary_keyword: string
  supporting_keywords: string[]
  question_keywords: string[]
  external_references: { url: string; title: string; authority: string }[]
  image_suggestions: { query: string; source: string }[]
  tags: string[]
  reading_time: string
  schema_type: string
  suggested_category: string
  category_confidence: number
  social_drafts: { platform: string; content: string }[]
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
    supabase.from("keyword_articles").select("id, keyword, search_volume, competition, category_id, trend_direction, last_updated").order("search_volume", { ascending: false }).limit(50),
  ])

  const existingTitles = (posts || []).map(p => p.title?.toLowerCase() || "")
  const catMap = new Map((categories || []).map(c => [c.id, c.name]))

  const opportunities: OpportunityScore[] = (keywords || [])
    .filter(kw => !existingTitles.some(et => et.includes(kw.keyword?.toLowerCase()?.split(" ")[0] || "")))
    .slice(0, 20)
    .map(kw => {
      const searchDemand = Math.min(100, Math.max(10, (kw.search_volume || 1000) / 200))
      const trend = Math.min(100, Math.max(10, (kw.trend_direction || 50) * 20))
      const competitionInv = Math.max(10, 100 - (kw.competition || 50))
      const categoryName = catMap.get(kw.category_id || "") || "Technology"
      const catPosts = (posts || []).filter(p => p.category_id === kw.category_id)
      const catViews = catPosts.reduce((s, p) => s + (p.views || 0), 0)
      const interest = Math.min(100, Math.max(10, catPosts.length > 0 ? Math.round(catViews / catPosts.length / 20) : 30))

      const score = calculateOpportunityScore({
        search_demand: searchDemand,
        trend_direction: trend,
        freshness: 70,
        competition_inverse: competitionInv,
        existing_coverage_inverse: 70,
        reader_interest: interest,
        business_value: Math.round(searchDemand * 0.8),
        expertise: Math.round(searchDemand * 0.7),
      })
      score.topic = kw.keyword || "Unknown Topic"
      score.category = categoryName
      return score
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  return opportunities
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
  const supabase = createClient()
  const { data } = await supabase.from("trend_predictions").select("*").order("probability", { ascending: false }).limit(20)
  return (data || []).map(t => ({
    topic: t.topic,
    probability: t.probability,
    confidence: t.confidence,
    time_window: t.time_window,
    sources: t.sources || [],
    recommendation: t.recommendation || "Monitor",
    category: t.category || "Technology",
  }))
}

export async function generateCompanyStories(): Promise<CompanyStory[]> {
  const supabase = createClient()
  const { data } = await supabase.from("company_watchlist").select("*").order("created_at", { ascending: false }).limit(20)
  return (data || []).map(c => ({
    company: c.company,
    headline: c.headline || `${c.company} — latest updates`,
    source: c.source || "Industry News",
    date: c.created_at || new Date().toISOString(),
    category: c.category || "Technology",
    relevance: c.relevance || 70,
    url: c.url,
  }))
}

export async function generateBreakingNews() {
  const supabase = createClient()
  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, category_id, created_at, status")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(10)

  return (posts || []).map(p => {
    const hoursAgo = Math.floor((Date.now() - new Date(p.created_at || 0).getTime()) / 3600000)
    return {
      title: p.title || "Untitled",
      category: p.category_id || "Technology",
      source: "TechPivo",
      time: hoursAgo <= 1 ? "1 hour ago" : `${hoursAgo} hours ago`,
      urgency: hoursAgo < 6 ? "high" as const : hoursAgo < 24 ? "medium" as const : "low" as const,
      url: `/posts/${p.id}`,
    }
  })
}

export async function generateContentGaps(): Promise<ContentGap[]> {
  const supabase = createClient()
  const { data } = await supabase.from("content_gaps").select("*").order("priority", { ascending: false }).limit(20)
  return (data || []).map(g => ({
    topic: g.topic,
    category: g.category || "Technology",
    search_volume: g.search_volume || 0,
    competition_level: g.competition_level || "Medium",
    competitor_coverage: g.competitor_coverage || [],
    gap_type: g.gap_type || "discovered",
    priority: g.priority || 5,
  }))
}

export async function generateCompetitorData(): Promise<CompetitorData[]> {
  const supabase = createClient()
  const { data } = await supabase.from("competitor_watch").select("*").limit(20)
  return (data || []).map(c => ({
    name: c.name,
    website: c.website,
    category_focus: c.category_focus || [],
    publishing_frequency: c.publishing_frequency || "Unknown",
    trending_topics: c.trending_topics || [],
    estimated_da: c.estimated_da || 0,
    overlap_score: c.overlap_score || 0,
  }))
}

export async function generateProductLaunches(): Promise<ProductLaunch[]> {
  const supabase = createClient()
  const { data } = await supabase.from("product_launches").select("*").order("launch_date", { ascending: true }).limit(20)
  return (data || []).map(p => ({
    company: p.company,
    product_name: p.product_name,
    product_type: p.product_type || "Product",
    launch_date: p.launch_date,
    status: p.status || "upcoming",
    article_ideas: p.article_ideas || [],
  }))
}

export async function generateEditorialQueue(): Promise<EditorialQueueItem[]> {
  const supabase = createClient()
  const { data } = await supabase.from("editorial_queue").select("*").order("priority", { ascending: false }).limit(20)
  return (data || []).map(q => ({
    id: q.id,
    title: q.title,
    category: q.category || "Technology",
    stage: q.stage || "researching",
    priority: q.priority || 5,
    created_at: q.created_at || new Date().toISOString(),
  }))
}

export async function generateSmartCalendar() {
  const supabase = createClient()
  const { data: posts } = await supabase
    .from("posts")
    .select("created_at, status")
    .order("created_at", { ascending: false })
    .limit(100)

  const postDates = new Map<string, number>()
  ;(posts || []).forEach(p => {
    if (p.created_at) {
      const d = p.created_at.split("T")[0]
      postDates.set(d, (postDates.get(d) || 0) + 1)
    }
  })

  const { data: launches } = await supabase.from("product_launches").select("launch_date").limit(20)
  const launchDates = new Set((launches || []).map(l => l.launch_date))

  const today = new Date()
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    const dateStr = date.toISOString().split("T")[0]
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" })
    const historicalCount = postDates.get(dateStr) || 0
    const articles = i === 0 ? Math.max(1, historicalCount) : historicalCount > 0 ? historicalCount : Math.floor(Math.random() * 2)

    return {
      date: dateStr,
      day: dayName,
      articles_count: articles,
      has_launch: launchDates.has(dateStr) || i === 14 || i === 21,
      has_event: i === 7,
    }
  })
}

export async function generateDailyBriefing() {
  const supabase = createClient()

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ count: recentPosts }, { count: totalPosts }, { count: totalViews }] = await Promise.all([
    supabase.from("posts").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("event_type", "page_view").gte("created_at", sevenDaysAgo),
  ])

  return {
    summary: `You have ${totalPosts || 0} published posts. ${recentPosts || 0} published in the last 7 days with ${totalViews || 0} page views tracked.`,
    key_metrics: {
      traffic_change: totalViews && totalViews > 0 ? "+Active" : "No data",
      new_rankings: recentPosts || 0,
      declining_articles: 0,
      trending_categories: [],
      revenue_trend: "unknown",
    },
    top_actions: [
      "Review keyword opportunities for your next article",
      "Check that all posts have proper meta descriptions",
      "Ensure internal links are up to date",
    ],
  }
}

export async function generateResearchResults(topic: string) {
  const supabase = createClient()

  const { data: existingPosts } = await supabase
    .from("posts")
    .select("id, title, views")
    .ilike("title", `%${topic}%`)
    .limit(5)

  const { data: keywords } = await supabase
    .from("keyword_articles")
    .select("keyword, search_volume, competition")
    .ilike("keyword", `%${topic}%`)
    .limit(10)

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")

  const catSuggestion = categories?.find(c =>
    [c.name, topic].some(s => s?.toLowerCase().includes(c.name?.toLowerCase() || ""))
  )

  return {
    topic,
    official_sources: [
      { title: `Search for "${topic}"`, url: `https://google.com/search?q=${encodeURIComponent(topic)}`, authority: "Search" },
    ],
    news_coverage: existingPosts?.length ? existingPosts.map(p => ({
      title: p.title,
      source: "TechPivo",
      date: new Date().toISOString(),
    })) : [{ title: `No existing coverage found for "${topic}"`, source: "TechPivo", date: new Date().toISOString() }],
    existing_articles: (existingPosts || []).map(p => ({
      title: p.title || "Untitled",
      url: `/posts/${p.id}`,
      views: p.views || 0,
    })),
    keywords: (keywords || []).map(k => ({
      keyword: k.keyword,
      volume: k.search_volume || 0,
      difficulty: k.competition || 50,
    })),
    faqs: [
      { q: `What is ${topic}?`, a: `Research requires manual verification. ${topic} is a topic you're researching.` },
      { q: `Why is ${topic} important?`, a: `Based on your keyword data, assess relevance to your audience.` },
      { q: `How to get started with ${topic}?`, a: `Gather official documentation and trusted sources for ${topic}.` },
    ],
  }
}

export function generateArticlePlan(topic: string, category: string): ArticlePlan {
  return {
    title: `The Complete Guide to ${topic} in 2026`,
    seo_title: `${topic}: Complete Guide, Features & Best Practices [2026]`,
    slug: topic.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    meta_description: `Everything you need to know about ${topic} in 2026. Features, comparisons, tutorials, and expert recommendations.`,
    outline: [
      { heading: `What is ${topic}?`, points: ["Definition and overview", "Why it matters in 2026", "Key capabilities"] },
      { heading: `How ${topic} Works`, points: ["Core technology", "Architecture overview", "Key components"] },
      { heading: `Top ${topic} Tools & Solutions`, points: ["Tool 1 comparison", "Tool 2 comparison", "Tool 3 comparison", "Comparison table"] },
      { heading: `Getting Started with ${topic}`, points: ["Prerequisites", "Step-by-step guide", "Best practices"] },
      { heading: `${topic} vs Alternatives`, points: ["Feature comparison", "Pricing comparison", "Use case recommendations"] },
      { heading: `Expert Tips & Best Practices`, points: ["Performance optimization", "Security considerations", "Common mistakes to avoid"] },
      { heading: `FAQs`, points: ["5 frequently asked questions with detailed answers"] },
    ],
    faqs: [
      { question: `What is ${topic}?`, answer: `${topic} is a technology that enables...` },
      { question: `Why is ${topic} important?`, answer: `${topic} is important because...` },
      { question: `How do I get started with ${topic}?`, answer: `To get started with ${topic}...` },
      { question: `What are the best ${topic} tools?`, answer: `The best ${topic} tools include...` },
      { question: `Is ${topic} free?`, answer: `${topic} pricing varies by provider...` },
    ],
    primary_keyword: topic.toLowerCase(),
    supporting_keywords: [`${topic} tutorial`, `${topic} guide`, `best ${topic} tools`, `${topic} 2026`],
    question_keywords: [`what is ${topic}`, `how to use ${topic}`, `why ${topic}`, `${topic} vs alternatives`, `best ${topic}`],
    external_references: [
      { url: "#", title: `Official ${topic} Documentation`, authority: "Official" },
      { url: "#", title: `${topic} GitHub Repository`, authority: "Developer" },
      { url: "#", title: `${topic} on MDN`, authority: "Documentation" },
    ],
    image_suggestions: [
      { query: `${topic} dashboard interface`, source: "Pexels" },
      { query: `${topic} code example`, source: "AI Generated" },
      { query: `${topic} architecture diagram`, source: "AI Generated" },
    ],
    tags: [topic, category, "technology", "tutorial", "guide", "2026"],
    reading_time: "12 min read",
    schema_type: "Article",
    suggested_category: category,
    category_confidence: 95,
    social_drafts: [
      { platform: "X", content: `Just published: The Complete Guide to ${topic} in 2026. Everything you need to know to get started. #TechPivo #${topic.replace(/\s/g, "")}` },
      { platform: "LinkedIn", content: `New article: ${topic} — A comprehensive guide covering features, comparisons, and best practices for 2026.` },
      { platform: "Facebook", content: `New on TechPivo: ${topic} complete guide. Learn everything about this trending technology.` },
    ],
  }
}
