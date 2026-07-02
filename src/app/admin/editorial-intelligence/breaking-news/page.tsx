"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Newspaper, ArrowLeft, RefreshCw, Clock, Globe, Zap,
  AlertTriangle, ChevronRight, ExternalLink, Tag
} from "lucide-react"

interface BreakingStory {
  title: string
  source: string
  time: string
  category: string
  urgency: "high" | "medium" | "low"
  url?: string
}

export default function BreakingNewsPage() {
  const [stories, setStories] = useState<BreakingStory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/admin/editorial-intelligence/api?section=breaking")
      .then(r => r.json())
      .then(d => { setStories(d.breaking || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading breaking news...</p>
        </div>
      </div>
    )
  }

  const urgencyBadge = (urgency: string) => {
    const styles: Record<string, string> = {
      high: "bg-red-500 text-white",
      medium: "bg-amber-500 text-white",
      low: "bg-blue-500 text-white",
    }
    return (
      <span className={`px-2.5 py-1 rounded text-xs font-bold shrink-0 ${styles[urgency] || styles.low}`}>
        {urgency.toUpperCase()}
      </span>
    )
  }

  const urgencyDot = (urgency: string) => {
    const colors: Record<string, string> = {
      high: "bg-red-500",
      medium: "bg-amber-500",
      low: "bg-blue-500",
    }
    return colors[urgency] || colors.low
  }

  const highStories = stories.filter(s => s.urgency === "high")
  const mediumStories = stories.filter(s => s.urgency === "medium")
  const lowStories = stories.filter(s => s.urgency === "low")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/editorial-intelligence" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-3 w-3" />
            Back to Editorial Intelligence
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-red-500" />
            Breaking News
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time news feeds from official sources
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">High Urgency</span>
          </div>
          <div className="text-2xl font-bold text-red-500">{highStories.length}</div>
        </div>
        <div className="p-4 rounded-xl border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-xs text-muted-foreground">Medium Urgency</span>
          </div>
          <div className="text-2xl font-bold text-amber-500">{mediumStories.length}</div>
        </div>
        <div className="p-4 rounded-xl border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-xs text-muted-foreground">Low Urgency</span>
          </div>
          <div className="text-2xl font-bold text-blue-500">{lowStories.length}</div>
        </div>
      </div>

      {highStories.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-red-500 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            High Priority
          </h2>
          {highStories.map((story, i) => (
            <div key={i} className="p-5 rounded-xl border bg-card flex items-start gap-4">
              {urgencyBadge(story.urgency)}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base mb-1">{story.title}</h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    {story.source}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {story.time}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-muted text-xs flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {story.category}
                  </span>
                </div>
              </div>
              <Link
                href={`/admin/editorial-intelligence/generate?topic=${encodeURIComponent(story.title)}&category=${encodeURIComponent(story.category)}`}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 flex items-center gap-1.5 shrink-0"
              >
                <Zap className="h-3.5 w-3.5" />
                Cover Story
              </Link>
            </div>
          ))}
        </div>
      )}

      {mediumStories.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            Medium Priority
          </h2>
          {mediumStories.map((story, i) => (
            <div key={i} className="p-4 rounded-xl border bg-card flex items-start gap-4">
              {urgencyBadge(story.urgency)}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">{story.title}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {story.source}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {story.time}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-muted text-[10px] flex items-center gap-1">
                    <Tag className="h-2.5 w-2.5" />
                    {story.category}
                  </span>
                </div>
              </div>
              <Link
                href={`/admin/editorial-intelligence/generate?topic=${encodeURIComponent(story.title)}&category=${encodeURIComponent(story.category)}`}
                className="px-3 py-1.5 bg-amber-500 text-white rounded text-xs font-medium hover:bg-amber-600 shrink-0"
              >
                Cover Story
              </Link>
            </div>
          ))}
        </div>
      )}

      {lowStories.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            Lower Priority
          </h2>
          {lowStories.map((story, i) => (
            <div key={i} className="p-4 rounded-xl border bg-card flex items-start gap-4">
              {urgencyBadge(story.urgency)}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">{story.title}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {story.source}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {story.time}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-muted text-[10px] flex items-center gap-1">
                    <Tag className="h-2.5 w-2.5" />
                    {story.category}
                  </span>
                </div>
              </div>
              <Link
                href={`/admin/editorial-intelligence/generate?topic=${encodeURIComponent(story.title)}&category=${encodeURIComponent(story.category)}`}
                className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 shrink-0"
              >
                Cover Story
              </Link>
            </div>
          ))}
        </div>
      )}

      {stories.length === 0 && (
        <div className="text-center py-16">
          <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No breaking stories at the moment</p>
        </div>
      )}
    </div>
  )
}
