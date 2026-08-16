"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Newspaper, RefreshCw, Clock, Globe, ExternalLink,
  AlertTriangle, ChevronRight, Tag, Radio, PenLine, Loader2, CheckCircle2
} from "lucide-react"

interface BreakingStory {
  title: string
  source: string
  time: string
  category: string
  urgency: "high" | "medium" | "low"
  url?: string
}

const REFRESH_MS = 60_000

export default function BreakingNewsPage() {
  const [stories, setStories] = useState<BreakingStory[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [rewritingKey, setRewritingKey] = useState<string | null>(null)
  const [rewriteInfo, setRewriteInfo] = useState<{ headline: string; url: string } | null>(null)
  const [rewriteError, setRewriteError] = useState<string | null>(null)

  const loadStories = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    try {
      const res = await fetch("/admin/editorial-intelligence/api?section=breaking", { cache: "no-store" })
      const data = await res.json()
      setStories(data.breaking || [])
      setLastUpdated(new Date())
    } catch {
      // keep previous stories on network failure
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadStories()
    const interval = setInterval(() => loadStories(true), REFRESH_MS)
    return () => clearInterval(interval)
  }, [loadStories])

  const handleRewrite = useCallback(async (story: BreakingStory) => {
    const key = story.url || story.title
    setRewritingKey(key)
    setRewriteInfo(null)
    setRewriteError(null)
    try {
      const res = await fetch("/api/admin/breaking-news-rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: story.title, url: story.url, category: story.category }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Rewrite failed")
      setRewriteInfo({ headline: data.headline || story.title, url: data.url })
      // Story is now covered — drop it from the list so it is never offered again
      setStories(prev => prev.filter(s => (s.url || s.title) !== key))
    } catch (e: any) {
      const message = e.message || "Rewrite failed"
      // Duplicate (409) means the story is already covered — remove it too
      if (/duplicate/i.test(message)) {
        setRewriteInfo(null)
        setStories(prev => prev.filter(s => (s.url || s.title) !== key))
      }
      setRewriteError(message)
    } finally {
      setRewritingKey(null)
    }
  }, [])

  useEffect(() => {
    loadStories()
    const interval = setInterval(() => loadStories(true), REFRESH_MS)
    return () => clearInterval(interval)
  }, [loadStories])

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

  const renderStory = (story: BreakingStory) => {
    const key = story.url || story.title
    const isRewriting = rewritingKey === key
    return (
      <div key={key} className="p-5 rounded-xl border bg-card flex items-start gap-4">
        {urgencyBadge(story.urgency)}
        <div className="flex-1 min-w-0">
          {story.url ? (
            <a
              href={story.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-base mb-1 block hover:text-primary transition-colors group"
            >
              <span className="flex items-start gap-1">
                {story.title}
                <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-1 opacity-50 group-hover:opacity-100" />
              </span>
            </a>
          ) : (
            <h3 className="font-semibold text-base mb-1">{story.title}</h3>
          )}
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
        <button
          onClick={() => handleRewrite(story)}
          disabled={rewritingKey !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card text-xs font-medium hover:bg-muted disabled:opacity-50 shrink-0"
        >
          {isRewriting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5" />}
          {isRewriting ? "Rewriting..." : "Rewrite"}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-red-500" />
            Breaking News
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-bold">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5" />
            Live feeds from The Verge, TechCrunch, Ars Technica, The Hacker News, BleepingComputer & more — auto-refreshes every 60s
            {lastUpdated && (
              <span className="text-muted-foreground/70">
                · Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => loadStories(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
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

      {rewriteInfo && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Article published: {rewriteInfo.headline}</p>
            <p className="text-xs text-muted-foreground">
              Rewritten from the source story with Google Search grounding
            </p>
          </div>
          <Link
            href={rewriteInfo.url}
            target="_blank"
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline shrink-0"
          >
            View article <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {rewriteError && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{rewriteError}</p>
          <button onClick={() => setRewriteError(null)} className="ml-auto text-xs text-red-400 hover:text-red-600 shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {highStories.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-red-500 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            High Priority
          </h2>
          {highStories.map(renderStory)}
        </div>
      )}

      {mediumStories.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            Medium Priority
          </h2>
          {mediumStories.map(renderStory)}
        </div>
      )}

      {lowStories.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            Lower Priority
          </h2>
          {lowStories.map(renderStory)}
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
