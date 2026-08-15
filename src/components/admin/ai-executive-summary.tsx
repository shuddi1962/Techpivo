"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Brain, TrendingUp, TrendingDown, AlertCircle, RefreshCw, Zap, Target, ArrowRight, ExternalLink } from "lucide-react"

interface AiInsight {
  type: "positive" | "negative" | "neutral" | "action"
  message: string
  metric?: string
  value?: string
  href?: string
}

export function AiExecutiveSummary() {
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const [insights, setInsights] = useState<AiInsight[]>([])
  const [loading, setLoading] = useState(true)
  const busyRef = useRef(false)

  useEffect(() => {
    generateInsights()
    const interval = setInterval(generateInsights, 60000)

    const client = supabaseRef.current
    const channel = client
      .channel(`ai_exec_summary_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => generateInsights(true))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "analytics_events" }, () => generateInsights(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "seo_issues" }, () => generateInsights(true))
      .subscribe()

    const onFocus = () => generateInsights(true)
    window.addEventListener("focus", onFocus)

    return () => {
      clearInterval(interval)
      client.removeChannel(channel)
      window.removeEventListener("focus", onFocus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const generateInsights = async (quiet = false) => {
    if (busyRef.current) return
    busyRef.current = true
    if (!quiet) setLoading(true)
    const supabase = supabaseRef.current

    const [postsRes, analyticsRes, seoRes, categoriesRes] = await Promise.all([
      supabase.from("posts").select("id, title, status, published_at, created_at, views, category_id").eq("status", "published"),
      supabase.from("analytics_events").select("created_at").eq("event_type", "page_view").gte("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from("seo_issues").select("id, severity").eq("resolved", false),
      supabase.from("categories").select("id, name")
    ])

    const posts = postsRes.data || []
    const analytics = analyticsRes.data || []
    const seoIssues = seoRes.data || []
    const categories = categoriesRes.data || []
    const categoryNames = new Map(categories.map((c: any) => [c.id, c.name]))

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
        value: `${thisWeekCount.toLocaleString()} views`,
        href: "/admin/analytics"
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
        value: `${thisWeekPosts.length} articles`,
        href: "/admin/posts"
      })
    }

    // SEO issues
    const criticalIssues = seoIssues.filter(i => i.severity === "critical")
    if (criticalIssues.length > 0) {
      newInsights.push({
        type: "negative",
        message: `${criticalIssues.length} critical SEO issues need attention`,
        metric: "Critical Issues",
        value: `${criticalIssues.length} found`,
        href: "/admin/seo"
      })
    } else if (seoIssues.length > 0) {
      newInsights.push({
        type: "neutral",
        message: `${seoIssues.length} SEO issues are open across your articles`,
        metric: "SEO Health",
        value: `${seoIssues.length} open`,
        href: "/admin/seo"
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
        value: `${stalePosts.length} articles`,
        href: `/admin/posts/${stalePosts[0].id}/edit`
      })
    }

    // Top category (published posts only)
    const categoryCounts = posts.reduce((acc, p) => {
      acc[p.category_id] = (acc[p.category_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]
    if (topCategory) {
      const catName = categoryNames.get(topCategory[0]) || topCategory[0]
      newInsights.push({
        type: "neutral",
        message: `Your strongest category is ${catName} with ${topCategory[1]} published articles`,
        metric: "Top Category",
        value: catName,
        href: "/admin/posts"
      })
    }

    // No data yet
    if (newInsights.length === 0) {
      newInsights.push({
        type: "neutral",
        message: "Publish your first article to start seeing AI insights here",
        metric: "Getting Started",
        value: "No data yet",
        href: "/admin/posts/new"
      })
    }

    setInsights(newInsights)
    setLoading(false)
    busyRef.current = false
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
          <div className="flex items-center gap-1">
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground mr-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Realtime
            </span>
            <Button variant="ghost" size="sm" onClick={() => generateInsights()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map((insight, i) => (
            <div
              key={i}
              role={insight.href ? "button" : undefined}
              tabIndex={insight.href ? 0 : undefined}
              onClick={() => insight.href && router.push(insight.href)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && insight.href) router.push(insight.href)
              }}
              className={`group flex items-start gap-3 p-3 rounded-lg border transition-colors ${insight.href ? "cursor-pointer hover:border-primary/40 hover:bg-muted/40" : ""}`}
            >
              <div className="mt-0.5">{getIcon(insight.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {getBadge(insight.type)}
                  {insight.metric && (
                    <span className="text-sm font-medium text-muted-foreground">
                      {insight.metric}: {insight.value}
                    </span>
                  )}
                </div>
                <p className="text-sm">{insight.message}</p>
              </div>
              {insight.href ? (
                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
              ) : (
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
