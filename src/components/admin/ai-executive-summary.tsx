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
    
    const [postsRes, analyticsRes, seoRes] = await Promise.all([
      supabase.from("posts").select("id, status, published_at, created_at, views, category_id"),
      supabase.from("analytics_events").select("created_at").gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from("seo_issues").select("id, severity").eq("resolved", false)
    ])

    const posts = postsRes.data || []
    const analytics = analyticsRes.data || []
    const seoIssues = seoRes.data || []

    const newInsights: AiInsight[] = []

    // Traffic trend
    const thisWeekPosts = posts.filter(p => {
      const pubDate = new Date(p.published_at || p.created_at)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return pubDate >= weekAgo
    })

    if (thisWeekPosts.length > 0) {
      const totalViews = thisWeekPosts.reduce((sum, p) => sum + (p.views || 0), 0)
      newInsights.push({
        type: "positive",
        message: `${thisWeekPosts.length} articles published this week with ${totalViews.toLocaleString()} total views`,
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

    // Content recommendations
    newInsights.push({
      type: "action",
      message: "Consider refreshing your top 5 performing articles to maintain rankings",
      metric: "Content Refresh",
      value: "5 articles"
    })

    // Top category
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
