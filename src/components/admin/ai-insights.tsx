"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Brain, TrendingUp, AlertTriangle, Lightbulb, RefreshCw,
  ArrowUpRight, ArrowDownRight, BarChart3, FileText, Eye,
} from "lucide-react"

interface Insight {
  id: string
  type: "success" | "warning" | "info" | "action"
  title: string
  description: string
  metric?: string
  change?: string
  positive?: boolean
}

export function AiInsights() {
  const supabase = createClient()
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  const generateInsights = useCallback(async () => {
    setLoading(true)
    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const twoWeeksAgo = new Date(now)
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

    const [posts, recentViews, olderViews, categories] = await Promise.all([
      supabase.from("posts").select("id, title, slug, views, category_id, updated_at, status").eq("status", "published"),
      supabase.from("analytics_events").select("created_at").eq("event_type", "page_view").gte("created_at", weekAgo.toISOString()),
      supabase.from("analytics_events").select("created_at").eq("event_type", "page_view").gte("created_at", twoWeeksAgo.toISOString()).lt("created_at", weekAgo.toISOString()),
      supabase.from("categories").select("id, name"),
    ])

    const newInsights: Insight[] = []
    const thisWeekViews = recentViews.data?.length || 0
    const lastWeekViews = olderViews.data?.length || 0
    const viewsChange = lastWeekViews > 0 ? ((thisWeekViews - lastWeekViews) / lastWeekViews * 100) : 0

    if (viewsChange > 10) {
      newInsights.push({
        id: "traffic-up",
        type: "success",
        title: "Traffic is growing",
        description: `Organic traffic increased by ${viewsChange.toFixed(0)}% compared to last week.`,
        metric: `${thisWeekViews.toLocaleString()} views`,
        change: `+${viewsChange.toFixed(0)}%`,
        positive: true,
      })
    } else if (viewsChange < -10) {
      newInsights.push({
        id: "traffic-down",
        type: "warning",
        title: "Traffic is declining",
        description: `Organic traffic dropped by ${Math.abs(viewsChange).toFixed(0)}% compared to last week.`,
        metric: `${thisWeekViews.toLocaleString()} views`,
        change: `${viewsChange.toFixed(0)}%`,
        positive: false,
      })
    }

    const allPosts = posts.data || []
    const highTraffic = allPosts.filter(p => (p.views || 0) > 100).slice(0, 3)
    if (highTraffic.length > 0) {
      newInsights.push({
        id: "top-performers",
        type: "success",
        title: "Top performing articles",
        description: `${highTraffic.length} articles have over 100 views. Consider creating related content.`,
        metric: highTraffic.map(p => p.title?.slice(0, 30)).join(", "),
      })
    }

    const stalePosts = allPosts.filter(p => {
      const updated = new Date(p.updated_at || 0)
      const daysSince = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24)
      return daysSince > 90 && (p.views || 0) > 50
    })
    if (stalePosts.length > 0) {
      newInsights.push({
        id: "stale-content",
        type: "action",
        title: "Content needs refreshing",
        description: `${stalePosts.length} high-traffic articles haven't been updated in 90+ days. Refreshing them can boost rankings.`,
        metric: `${stalePosts.length} articles`,
      })
    }

    const catMap: Record<string, number> = {}
    allPosts.forEach(p => { if (p.category_id) catMap[p.category_id] = (catMap[p.category_id] || 0) + 1 })
    const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]
    if (topCat) {
      const catName = categories.data?.find(c => c.id === topCat[0])?.name || "Unknown"
      newInsights.push({
        id: "top-category",
        type: "info",
        title: `Strongest category: ${catName}`,
        description: `You have ${topCat[1]} published articles in this category. Consider building topical authority.`,
        metric: `${topCat[1]} articles`,
      })
    }

    const totalViews = allPosts.reduce((s, p) => s + (p.views || 0), 0)
    newInsights.push({
      id: "total-performance",
      type: "info",
      title: "Overall performance",
      description: `${allPosts.length} published articles with ${totalViews.toLocaleString()} total views.`,
      metric: `${(totalViews / Math.max(allPosts.length, 1)).toFixed(0)} avg views/article`,
    })

    setInsights(newInsights)
    setLoading(false)
  }, [])

  useEffect(() => { generateInsights() }, [generateInsights])

  const iconForType = (type: string) => {
    switch (type) {
      case "success": return <TrendingUp className="h-4 w-4 text-green-500" />
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "action": return <Lightbulb className="h-4 w-4 text-[#F59E0B]" />
      default: return <Brain className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <Brain className="h-5 w-5 text-[#F59E0B]" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">AI Insights</h2>
        </div>
        <button onClick={generateInsights} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg">
          <RefreshCw className={`h-4 w-4 text-gray-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="h-32 flex items-center justify-center text-sm text-gray-400">Analyzing data...</div>
      ) : (
        <div className="space-y-3">
          {insights.map(insight => (
            <div key={insight.id} className="flex gap-3 p-3 rounded-lg bg-gray-50 dark:bg-[#1F2937] border border-gray-100 dark:border-[#374151]">
              <div className="mt-0.5">{iconForType(insight.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{insight.title}</span>
                  {insight.change && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      insight.positive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {insight.change}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{insight.description}</p>
                {insight.metric && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 truncate">{insight.metric}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
