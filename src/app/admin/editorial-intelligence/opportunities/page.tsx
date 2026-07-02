"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Target, Star, Zap, ArrowLeft, RefreshCw, TrendingUp,
  BarChart3, Flame, Search, ChevronRight, ExternalLink
} from "lucide-react"

interface Opportunity {
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

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/admin/editorial-intelligence/api?section=opportunities")
      .then(r => r.json())
      .then(d => { setOpportunities(d.opportunities || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading opportunities...</p>
        </div>
      </div>
    )
  }

  const trendBadge = (trend: string) => {
    const styles: Record<string, string> = {
      breaking: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      rising: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      stable: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      declining: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
    }
    const labels: Record<string, string> = {
      breaking: "🔥 Breaking",
      rising: "📈 Rising",
      stable: "📊 Stable",
      declining: "📉 Declining",
    }
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${styles[trend] || styles.stable}`}>
        {labels[trend] || trend}
      </span>
    )
  }

  const trafficBadge = (level: string) => {
    const styles: Record<string, string> = {
      high: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      low: "bg-muted text-muted-foreground",
    }
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${styles[level] || styles.low}`}>
        {level} traffic
      </span>
    )
  }

  const competitionBadge = (level: string) => {
    const styles: Record<string, string> = {
      low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    }
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${styles[level] || styles.low}`}>
        {level} competition
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/editorial-intelligence" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-3 w-3" />
            Back to Editorial Intelligence
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Content Opportunities
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {opportunities.length} opportunities scored and ranked by AI
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/editorial-intelligence/generate" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Generate Article
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border bg-card">
          <div className="text-xs text-muted-foreground mb-1">Total Opportunities</div>
          <div className="text-2xl font-bold">{opportunities.length}</div>
        </div>
        <div className="p-4 rounded-xl border bg-card">
          <div className="text-xs text-muted-foreground mb-1">High Priority</div>
          <div className="text-2xl font-bold text-green-500">
            {opportunities.filter(o => o.score >= 80).length}
          </div>
        </div>
        <div className="p-4 rounded-xl border bg-card">
          <div className="text-xs text-muted-foreground mb-1">Breaking</div>
          <div className="text-2xl font-bold text-red-500">
            {opportunities.filter(o => o.trend === "breaking").length}
          </div>
        </div>
        <div className="p-4 rounded-xl border bg-card">
          <div className="text-xs text-muted-foreground mb-1">Avg Score</div>
          <div className="text-2xl font-bold">
            {opportunities.length > 0
              ? Math.round(opportunities.reduce((a, o) => a + o.score, 0) / opportunities.length)
              : 0}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {opportunities.map((opp, i) => (
          <div key={i} className="p-5 rounded-xl border bg-card flex flex-col md:flex-row md:items-center gap-4">
            <div className="text-center shrink-0 w-16">
              <div className="text-2xl font-bold text-primary">{opp.score}</div>
              <div className="flex justify-center">
                {Array.from({ length: opp.stars }, (_, j) => (
                  <Star key={j} className="h-3 w-3 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">Score</div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-base mb-1">{opp.topic}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span>{opp.category}</span>
                <span>·</span>
                <span className="text-primary font-medium">{opp.recommendation}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {trendBadge(opp.trend)}
                {trafficBadge(opp.traffic_potential)}
                {competitionBadge(opp.competition)}
                {opp.publish_urgency === "today" && (
                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-bold">
                    ⚡ Publish Today
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="hidden md:grid grid-cols-3 gap-3 text-center">
                <div className="p-2 rounded-lg bg-muted/30">
                  <BarChart3 className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
                  <div className="text-xs font-bold">{opp.search_demand}</div>
                  <div className="text-[9px] text-muted-foreground">Demand</div>
                </div>
                <div className="p-2 rounded-lg bg-muted/30">
                  <TrendingUp className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
                  <div className="text-xs font-bold">{opp.reader_interest}</div>
                  <div className="text-[9px] text-muted-foreground">Interest</div>
                </div>
                <div className="p-2 rounded-lg bg-muted/30">
                  <Flame className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
                  <div className="text-xs font-bold">{opp.freshness}</div>
                  <div className="text-[9px] text-muted-foreground">Fresh</div>
                </div>
              </div>
              <Link
                href={`/admin/editorial-intelligence/generate?topic=${encodeURIComponent(opp.topic)}&category=${encodeURIComponent(opp.category)}`}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-1.5 shrink-0"
              >
                <Zap className="h-3.5 w-3.5" />
                Generate
              </Link>
            </div>
          </div>
        ))}
      </div>

      {opportunities.length === 0 && (
        <div className="text-center py-16">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No opportunities found</p>
        </div>
      )}
    </div>
  )
}
