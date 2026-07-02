import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { searchParams } = new URL(req.url)
  const daysOld = parseInt(searchParams.get("days") || "90")

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, title, slug, views, updated_at, created_at, category_id, excerpt")
    .eq("status", "published")
    .lte("updated_at", cutoffDate.toISOString())
    .order("updated_at", { ascending: true })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const decayed = (posts || []).map(post => {
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(post.updated_at || post.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    const views = post.views || 0

    let urgencyScore = 0
    if (daysSinceUpdate > 365) urgencyScore += 40
    else if (daysSinceUpdate > 180) urgencyScore += 30
    else if (daysSinceUpdate > 90) urgencyScore += 20

    if (views > 1000) urgencyScore += 30
    else if (views > 500) urgencyScore += 20
    else if (views > 100) urgencyScore += 10

    let priority = "low"
    if (urgencyScore >= 50) priority = "critical"
    else if (urgencyScore >= 35) priority = "high"
    else if (urgencyScore >= 20) priority = "medium"

    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      views,
      updated_at: post.updated_at,
      days_since_update: daysSinceUpdate,
      urgency_score: urgencyScore,
      priority,
      recommendations: [
        daysSinceUpdate > 180 ? "Update factual information" : null,
        daysSinceUpdate > 90 ? "Refresh screenshots and links" : null,
        views > 500 ? "High-traffic article — prioritize update" : null,
        "Verify external links still work",
        "Check for new developments in the topic",
      ].filter(Boolean),
    }
  })

  decayed.sort((a, b) => b.urgency_score - a.urgency_score)

  return NextResponse.json({
    articles: decayed,
    total: decayed.length,
    summary: {
      critical: decayed.filter(d => d.priority === "critical").length,
      high: decayed.filter(d => d.priority === "high").length,
      medium: decayed.filter(d => d.priority === "medium").length,
      low: decayed.filter(d => d.priority === "low").length,
    },
  })
}
