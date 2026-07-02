"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Building2, ArrowLeft, RefreshCw, Globe, BarChart3, Tag,
  TrendingUp, Zap, Star, ChevronRight, Shield
} from "lucide-react"

interface CompanyStory {
  company: string
  headline: string
  source: string
  date: string
  category: string
  relevance: number
  url?: string
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyStory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/admin/editorial-intelligence/api?section=companies")
      .then(r => r.json())
      .then(d => { setCompanies(d.companies || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading company watchlist...</p>
        </div>
      </div>
    )
  }

  const groupedByCompany = companies.reduce<Record<string, CompanyStory[]>>((acc, story) => {
    if (!acc[story.company]) acc[story.company] = []
    acc[story.company].push(story)
    return acc
  }, {})

  const companyNames = Object.keys(groupedByCompany)
  const avgRelevance = companies.length > 0
    ? Math.round(companies.reduce((a, c) => a + c.relevance, 0) / companies.length)
    : 0
  const topCompany = companyNames.length > 0
    ? companyNames.reduce((a, b) => {
        const avgA = groupedByCompany[a].reduce((s, c) => s + c.relevance, 0) / groupedByCompany[a].length
        const avgB = groupedByCompany[b].reduce((s, c) => s + c.relevance, 0) / groupedByCompany[b].length
        return avgA >= avgB ? a : b
      })
    : "N/A"

  const relevanceColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-primary"
    if (score >= 40) return "text-amber-500"
    return "text-muted-foreground"
  }

  const relevanceBar = (score: number) => {
    if (score >= 80) return "bg-green-500"
    if (score >= 60) return "bg-primary"
    if (score >= 40) return "bg-amber-500"
    return "bg-muted"
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
            <Building2 className="h-6 w-6 text-purple-500" />
            Company Watchlist
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tracking {companyNames.length} companies across {companies.length} stories
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-5 rounded-xl border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-purple-500" />
            <span className="text-xs text-muted-foreground">Tracked Companies</span>
          </div>
          <div className="text-3xl font-bold">{companyNames.length}</div>
        </div>
        <div className="p-5 rounded-xl border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Average Relevance</span>
          </div>
          <div className="text-3xl font-bold">{avgRelevance}</div>
        </div>
        <div className="p-5 rounded-xl border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <Star className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Top Trending</span>
          </div>
          <div className="text-3xl font-bold truncate">{topCompany}</div>
        </div>
      </div>

      <div className="space-y-6">
        {companyNames.map((companyName) => {
          const stories = groupedByCompany[companyName]
          const companyAvg = Math.round(stories.reduce((a, c) => a + c.relevance, 0) / stories.length)

          return (
            <div key={companyName} className="rounded-xl border bg-card overflow-hidden">
              <div className="p-5 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg">{companyName}</h2>
                      <p className="text-xs text-muted-foreground">{stories.length} stories tracked</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${relevanceColor(companyAvg)}`}>{companyAvg}</div>
                    <div className="text-[10px] text-muted-foreground">Avg Relevance</div>
                    <div className="w-20 bg-muted rounded-full h-1.5 mt-1">
                      <div className={`rounded-full h-1.5 ${relevanceBar(companyAvg)}`} style={{ width: `${companyAvg}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="divide-y">
                {stories.map((story, j) => (
                  <div key={j} className="p-4 flex items-start gap-4 hover:bg-muted/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm mb-1">{story.headline}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {story.source}
                        </span>
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {story.category}
                        </span>
                        <span>{story.date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-lg font-bold ${relevanceColor(story.relevance)}`}>
                        {story.relevance}
                      </span>
                      <span className="text-[10px] text-muted-foreground">Rel</span>
                    </div>
                    <Link
                      href={`/admin/editorial-intelligence/generate?topic=${encodeURIComponent(story.headline)}&category=${encodeURIComponent(story.category)}`}
                      className="px-3 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary/90 shrink-0 flex items-center gap-1"
                    >
                      <Zap className="h-3 w-3" />
                      Cover
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {companies.length === 0 && (
        <div className="text-center py-16">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No company stories available</p>
        </div>
      )}
    </div>
  )
}
