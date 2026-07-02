"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  TrendingUp, ArrowLeft, RefreshCw, Clock, Target, Tag,
  Zap, BarChart3, ChevronRight, Flame
} from "lucide-react"

interface Trend {
  topic: string
  probability: number
  confidence: number
  time_window: string
  sources: string[]
  recommendation: string
  category: string
}

export default function TrendsPage() {
  const [trends, setTrends] = useState<Trend[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/admin/editorial-intelligence/api?section=trends")
      .then(r => r.json())
      .then(d => { setTrends(d.trends || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading trend predictions...</p>
        </div>
      </div>
    )
  }

  const probabilityColor = (prob: number) => {
    if (prob >= 80) return "bg-green-500"
    if (prob >= 60) return "bg-primary"
    if (prob >= 40) return "bg-amber-500"
    return "bg-red-500"
  }

  const confidenceBadge = (confidence: number) => {
    if (confidence >= 80) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    if (confidence >= 60) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
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
            <TrendingUp className="h-6 w-6 text-amber-500" />
            Trend Predictions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-predicted trending topics with probability scores
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border bg-card">
          <div className="text-xs text-muted-foreground mb-1">Total Trends</div>
          <div className="text-2xl font-bold">{trends.length}</div>
        </div>
        <div className="p-4 rounded-xl border bg-card">
          <div className="text-xs text-muted-foreground mb-1">High Probability</div>
          <div className="text-2xl font-bold text-green-500">
            {trends.filter(t => t.probability >= 80).length}
          </div>
        </div>
        <div className="p-4 rounded-xl border bg-card">
          <div className="text-xs text-muted-foreground mb-1">High Confidence</div>
          <div className="text-2xl font-bold text-primary">
            {trends.filter(t => t.confidence >= 80).length}
          </div>
        </div>
        <div className="p-4 rounded-xl border bg-card">
          <div className="text-xs text-muted-foreground mb-1">Avg Probability</div>
          <div className="text-2xl font-bold">
            {trends.length > 0
              ? Math.round(trends.reduce((a, t) => a + t.probability, 0) / trends.length)
              : 0}%
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {trends.map((trend, i) => (
          <div key={i} className="p-5 rounded-xl border bg-card">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-base">{trend.topic}</h3>
                  {trend.probability >= 80 && (
                    <Flame className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="px-2 py-0.5 rounded bg-muted flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {trend.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {trend.time_window}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0 ml-4">
                <div className="text-3xl font-bold text-primary">{trend.probability}%</div>
                <div className="text-[10px] text-muted-foreground">Probability</div>
              </div>
            </div>

            <div className="w-full bg-muted rounded-full h-2.5 mb-3">
              <div
                className={`rounded-full h-2.5 transition-all ${probabilityColor(trend.probability)}`}
                style={{ width: `${trend.probability}%` }}
              />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Target className="h-3 w-3" />
                  Confidence:
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${confidenceBadge(trend.confidence)}`}>
                    {trend.confidence}%
                  </span>
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Window: {trend.time_window}
                </span>
              </div>
              <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary font-medium text-xs">
                {trend.recommendation}
              </span>
            </div>

            <div className="flex flex-wrap gap-1 mt-3">
              {trend.sources.map((src, j) => (
                <span key={j} className="px-2 py-0.5 rounded bg-muted text-[10px] text-muted-foreground flex items-center gap-1">
                  <BarChart3 className="h-2.5 w-2.5" />
                  {src}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {trends.length === 0 && (
        <div className="text-center py-16">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No trend predictions available</p>
        </div>
      )}
    </div>
  )
}
