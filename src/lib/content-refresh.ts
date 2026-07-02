import { createClient } from "@/lib/supabase/admin"

export interface RefreshTrigger {
  type: "traffic_drop" | "competitor_update" | "factual_change" | "age" | "seo_degradation" | "broken_links" | "schema_error"
  priority: "high" | "medium" | "low"
  description: string
}

export interface RefreshRecommendation {
  post_id: string
  title: string
  slug: string
  triggers: RefreshTrigger[]
  urgency_score: number
  last_refreshed: string | null
  current_traffic: number
  suggested_action: string
}

export async function detectRefreshTriggers(): Promise<RefreshRecommendation[]> {
  const supabase = createClient()
  const recommendations: RefreshRecommendation[] = []

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: publishedPosts } = await supabase
    .from("posts")
    .select("id, title, slug, views, published_at, updated_at, tags")
    .eq("status", "published")
    .gte("published_at", ninetyDaysAgo)

  if (!publishedPosts) return recommendations

  for (const post of publishedPosts) {
    const triggers: RefreshTrigger[] = []

    // Traffic drop detection
    if (post.views < 50) {
      triggers.push({
        type: "traffic_drop",
        priority: "high",
        description: `Low traffic: ${post.views} views since publication`,
      })
    }

    // Age-based refresh
    const lastUpdate = new Date(post.updated_at || post.published_at)
    const daysSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceUpdate > 180) {
      triggers.push({
        type: "age",
        priority: "medium",
        description: `Content is ${daysSinceUpdate} days old without refresh`,
      })
    }

    if (triggers.length > 0) {
      const urgencyScore = triggers.reduce((sum, t) => {
        return sum + (t.priority === "high" ? 3 : t.priority === "medium" ? 2 : 1)
      }, 0)

      recommendations.push({
        post_id: post.id,
        title: post.title,
        slug: post.slug,
        triggers,
        urgency_score: urgencyScore,
        last_refreshed: post.updated_at,
        current_traffic: post.views,
        suggested_action: triggers.some(t => t.type === "traffic_drop")
          ? "Rewrite with updated facts and improved SEO"
          : "Review and update outdated information",
      })
    }
  }

  return recommendations.sort((a, b) => b.urgency_score - a.urgency_score)
}

export async function getRefreshStats() {
  const supabase = createClient()

  const { count: totalPublished } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("status", "published")

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count: recentlyRefreshed } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("status", "published")
    .gte("updated_at", thirtyDaysAgo)

  const triggers = await detectRefreshTriggers()
  const highPriority = triggers.filter(t => t.urgency_score >= 4).length

  return {
    totalPublished: totalPublished || 0,
    recentlyRefreshed: recentlyRefreshed || 0,
    needsRefresh: triggers.length,
    highPriority,
  }
}
