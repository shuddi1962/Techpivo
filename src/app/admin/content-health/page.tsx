"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  HeartPulse, AlertTriangle, CheckCircle, TrendingDown, TrendingUp,
  RefreshCw, ExternalLink, Image, FileText, Link2, Search,
  BarChart3, Clock, ArrowRight
} from "lucide-react"

interface HealthIssue {
  type: "traffic_drop" | "outdated" | "missing_image" | "missing_meta" | "low_seo"
  severity: "high" | "medium" | "low"
  count: number
  description: string
}

interface ArticleHealth {
  id: string
  title: string
  slug: string
  views: number
  quality_score: number
  seo_score: number
  published_at: string
  updated_at: string
  issues: HealthIssue[]
  refresh_priority: number
}

export default function ContentHealthPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [articles, setArticles] = useState<ArticleHealth[]>([])
  const [summary, setSummary] = useState({
    totalPublished: 0,
    needsRefresh: 0,
    highPriority: 0,
    avgQualityScore: 0,
    brokenLinks: 0,
    missingImages: 0,
    missingMeta: 0,
  })
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    setError("")
    setLoading(true)
    try {
      const { data: posts, error: postsErr } = await supabase
        .from("posts")
        .select("id, title, slug, views, content, published_at, updated_at, featured_image, seo_title, seo_description, seo_keywords")
        .eq("status", "published")
        .order("updated_at", { ascending: true })
        .limit(50)

      if (postsErr) throw postsErr
      if (!posts) { setLoading(false); return }

      const healthArticles: ArticleHealth[] = posts.map(post => {
        const issues: HealthIssue[] = []
        let refreshPriority = 0
        let qualityScore = 85
        let seoScore = 80

        if (post.views < 50) {
          issues.push({ type: "traffic_drop", severity: "high", count: 1, description: "Very low traffic" })
          refreshPriority += 3
          qualityScore -= 15
        } else if (post.views < 200) {
          issues.push({ type: "traffic_drop", severity: "medium", count: 1, description: "Below average traffic" })
          refreshPriority += 1
          qualityScore -= 5
        }

        const daysSinceUpdate = Math.floor((Date.now() - new Date(post.updated_at).getTime()) / (1000 * 60 * 60 * 24))
        if (daysSinceUpdate > 180) {
          issues.push({ type: "outdated", severity: "medium", count: 1, description: `${daysSinceUpdate} days since last update` })
          refreshPriority += 2
          qualityScore -= 10
          seoScore -= 10
        } else if (daysSinceUpdate > 90) {
          issues.push({ type: "outdated", severity: "low", count: 1, description: `${daysSinceUpdate} days since last update` })
          refreshPriority += 1
          qualityScore -= 5
          seoScore -= 5
        }

        if (!post.featured_image) {
          issues.push({ type: "missing_image", severity: "medium", count: 1, description: "No featured image" })
          refreshPriority += 1
          qualityScore -= 10
        }

        if (!post.seo_title || !post.seo_description) {
          issues.push({ type: "missing_meta", severity: "low", count: 1, description: "Missing SEO metadata" })
          refreshPriority += 1
          seoScore -= 15
        }

        const keywordCount = post.seo_keywords ? (typeof post.seo_keywords === 'string' ? JSON.parse(post.seo_keywords).length || 0 : 0) : 0
        if (keywordCount < 3) {
          seoScore -= 5
        }

        return {
          id: post.id,
          title: post.title,
          slug: post.slug,
          views: post.views || 0,
          quality_score: Math.max(0, Math.min(100, qualityScore)),
          seo_score: Math.max(0, Math.min(100, seoScore)),
          published_at: post.published_at || "",
          updated_at: post.updated_at,
          issues,
          refresh_priority: refreshPriority,
        }
      })

      healthArticles.sort((a, b) => b.refresh_priority - a.refresh_priority)

      setArticles(healthArticles)
      setSummary({
        totalPublished: healthArticles.length,
        needsRefresh: healthArticles.filter(a => a.refresh_priority > 2).length,
        highPriority: healthArticles.filter(a => a.refresh_priority >= 4).length,
        avgQualityScore: healthArticles.length > 0
          ? Math.round(healthArticles.reduce((s, a) => s + a.quality_score, 0) / healthArticles.length)
          : 0,
        brokenLinks: healthArticles.reduce((count, a) => {
          if (a.content) {
            const linkMatches = a.content.match(/https?:\/\/[^\s"')>]+/g)
            return count + (linkMatches ? linkMatches.length : 0)
          }
          return count
        }, 0),
        missingImages: healthArticles.filter(a => a.issues.some(i => i.type === "missing_image")).length,
        missingMeta: healthArticles.filter(a => a.issues.some(i => i.type === "missing_meta")).length,
      })
    } catch (err) {
      console.error("Failed to fetch content health:", err)
      setError("Failed to load content health data. Please try again.")
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HeartPulse className="h-6 w-6 text-red-500" />
            Content Health Monitor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track content quality, freshness, and issues</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Published", value: summary.totalPublished, icon: FileText, color: "text-blue-500" },
          { label: "Needs Refresh", value: summary.needsRefresh, icon: AlertTriangle, color: "text-amber-500" },
          { label: "High Priority", value: summary.highPriority, icon: TrendingDown, color: "text-red-500" },
          { label: "Avg Quality Score", value: loading ? "..." : summary.avgQualityScore + "/100", icon: TrendingUp, color: "text-green-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: "Missing Images", count: summary.missingImages, icon: Image, color: "text-amber-500" },
          { label: "Missing Meta Data", count: summary.missingMeta, icon: Search, color: "text-blue-500" },
          { label: "External Links Found", count: summary.brokenLinks, icon: Link2, color: "text-green-500" },
        ].map((issue) => (
          <div key={issue.label} className="bg-card border rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <issue.icon className={`h-4 w-4 ${issue.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium">{issue.label}</p>
                <p className="text-xs text-muted-foreground">Across all articles</p>
              </div>
            </div>
            <span className="text-2xl font-bold">{loading ? "..." : issue.count}</span>
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          Articles by Refresh Priority
        </h3>
        {loading ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
        ) : articles.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <HeartPulse className="h-12 w-12 mb-3 opacity-30" />
            <p>No published articles yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {articles.map((article) => (
              <div key={article.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    article.refresh_priority >= 4 ? "bg-red-500/10 text-red-500" :
                    article.refresh_priority >= 2 ? "bg-amber-500/10 text-amber-500" :
                    "bg-green-500/10 text-green-500"
                  }`}>
                    {article.refresh_priority}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate max-w-md">{article.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {article.views} views · Quality: {article.quality_score} · SEO: {article.seo_score}
                      {article.issues.length > 0 && ` · ${article.issues.length} issue(s)`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {article.issues.slice(0, 2).map((issue, i) => (
                    <span key={i} className={`px-2 py-1 rounded-full text-xs font-medium hidden sm:inline ${
                      issue.severity === "high" ? "bg-red-500/10 text-red-500" :
                      issue.severity === "medium" ? "bg-amber-500/10 text-amber-500" :
                      "bg-blue-500/10 text-blue-500"
                    }`}>
                      {issue.type.replace("_", " ")}
                    </span>
                  ))}
                  <Link
                    href={`/admin/posts/${article.id}/edit`}
                    className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
