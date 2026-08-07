"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Brain, TrendingUp, TrendingDown, AlertCircle, RefreshCw, Zap, Target, ArrowRight } from "lucide-react"

interface AiInsight {
  type: "positive" | "negative" | "neutral" | "action"
  message: string
  metric?: string
  value?: string
}

export function AiExecutiveSummary() {
  const [insights, setInsights] = useState<AiInsight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    generateInsights()
  }, [])

  const generateInsights = async () => {
    const supabase = createClient()
    setLoading(true)

    const [postsRes, analyticsRes, seoRes] = await Promise.all([
      supabase.from("posts").select("id, title, status, published_at, created_at, views, category_id").eq("status", "published"),
      supabase.from("analytics_events").select("created_at").eq("event_type", "page_view").gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from("seo_issues").select("id, severity").eq("resolved", false)
    ])

    const posts = postsRes.data || []
    const analytics = analyticsRes.data || []
    const seoIssues = seoRes.data || []

    const newInsights: AiInsight[] = []

    // Traffic trend vs previous week
    const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const lastWeekStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const thisWeekCount = analytics.filter(e => e.created_at >= thisWeek).length
    const lastWeekCount = analytics.filter(e => e.created_at >= lastWeekStart && e.created_at < thisWeek).length

    if (thisWeekCount > 0 || lastWeekCount > 0) {
      const diff = thisWeekCount - lastWeekCount
      newInsights.push({
        type: diff >= 0 ? "positive" : "negative",
        message: lastWeekCount > 0
          ? `Page views are ${diff >= 0 ? "up" : "down"} ${Math.abs(Math.round((diff / lastWeekCount) * 100))}% compared with last week`
          : `${thisWeekCount} page views recorded this week`,
        metric: "Weekly Traffic",
        value: `${thisWeekCount.toLocaleString()} views`
      })
    }

    // Recent publishing activity
    const thisWeekPosts = posts.filter(p => {
      const pubDate = new Date(p.published_at || p.created_at)
      return pubDate >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    })
    if (thisWeekPosts.length > 0) {
      const totalViews = thisWeekPosts.reduce((sum, p) => sum + (p.views || 0), 0)
      newInsights.push({
        type: "positive",
        message: `${thisWeekPosts.length} articles published this week with ${totalViews.toLocaleString()} combined views`,
        metric: "Weekly Output",
        value: `${thisWeekPosts.length} articles`
      })
    }

    // SEO issues
    const criticalIssues = seoIssues.filter(i => i.severity === "critical")
    if (criticalIssues.length > 0) {
      newInsights.push({
        type: "negative",
        message: `${criticalIssues.length} critical SEO issues need attention`,
        metric: "Critical Issues",
        value: `${criticalIssues.length} found`
      })
    }

    // Content refresh candidates: top-performing published posts older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const stalePosts = posts
      .filter(p => new Date(p.published_at || p.created_at) < thirtyDaysAgo)
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)

    if (stalePosts.length > 0) {
      const firstTitle = stalePosts[0].title.slice(0, 60)
      const extra = stalePosts.length - 1 > 0 ? ` and ${stalePosts.length - 1} more` : ""
      newInsights.push({
        type: "action",
        message: `Refresh "${firstTitle}"${extra} top articles to maintain rankings`,
        metric: "Content Refresh",
        value: `${stalePosts.length} articles`
      })
    }

    // Top category (published posts only)
    const categoryCounts = posts.reduce((acc, p) => {
      acc[p.category_id] = (acc[p.category_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]
    if (topCategory) {
      newInsights.push({
        type: "neutral",
        message: `Your strongest category has ${topCategory[1]} published articles`,
        metric: "Top Category",
        value: topCategory[1] + " articles"
      })
    }

    // No data yet
    if (newInsights.length === 0) {
      newInsights.push({
        type: "neutral",
        message: "Publish your first article to start seeing AI insights here",
        metric: "Getting Started",
        value: "No data yet"
      })
    }

    setInsights(newInsights)
    setLoading(false)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "positive": return <TrendingUp className="h-5 w-5 text-green-600" />
      case "negative": return <TrendingDown className="h-5 w-5 text-red-600" />
      case "action": return <Zap className="h-5 w-5 text-blue-600" />
      default: return <Target className="h-5 w-5 text-purple-600" />
    }
  }

  const getBadge = (type: string) => {
    switch (type) {
      case "positive": return <Badge className="bg-green-100 text-green-800">Positive</Badge>
      case "negative": return <Badge variant="destructive">Needs Attention</Badge>
      case "action": return <Badge className="bg-blue-100 text-blue-800">Action</Badge>
      default: return <Badge variant="secondary">Insight</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Executive Summary
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={generateInsights}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
              <div className="mt-0.5">{getIcon(insight.type)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {getBadge(insight.type)}
                  {insight.metric && (
                    <span className="text-sm font-medium text-muted-foreground">
                      {insight.metric}: {insight.value}
                    </span>
                  )}
                </div>
                <p className="text-sm">{insight.message}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
