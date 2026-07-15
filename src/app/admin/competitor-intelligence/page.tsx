"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Swords, TrendingUp, TrendingDown, Globe, BarChart3,
  RefreshCw, ExternalLink, AlertTriangle, CheckCircle, Loader2
} from "lucide-react"

interface Competitor {
  id: string
  name: string
  domain: string
  estimated_authority: number
  publishing_frequency: string
  strengths: string[]
  weaknesses: string[]
  primary_categories: string[]
  articles_tracked: number
  last_scraped: string | null
}

export default function CompetitorIntelligencePage() {
  const supabase = createClient()
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCompetitors = async () => {
      try {
        const { data, error } = await supabase
          .from("competitor_watch")
          .select("*")
          .order("estimated_authority", { ascending: false })
        if (error) throw error
        const comps = (data || []) as Competitor[]
        setCompetitors(comps)
        if (comps.length > 0) setSelectedId(comps[0].id)
      } catch (err) {
        console.error("Failed to fetch competitors:", err)
      }
      setLoading(false)
    }
    fetchCompetitors()
  }, [supabase])

  const selected = competitors.find(c => c.id === selectedId) || competitors[0]

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Swords className="h-6 w-6 text-red-500" />
            Competitor Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Loading competitor data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Swords className="h-6 w-6 text-red-500" />
          Competitor Intelligence
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor competitors and identify content opportunities</p>
      </div>

      {competitors.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#111827] border rounded-xl">
          <Swords className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No competitors tracked yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Add competitors to start monitoring their content and identifying opportunities.</p>
          <a href="/admin/competitor-intelligence/add" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
            Add Competitor
          </a>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {competitors.map((competitor) => (
              <div
                key={competitor.id}
                onClick={() => setSelectedId(competitor.id)}
                className={`bg-white dark:bg-[#111827] border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedId === competitor.id ? "ring-2 ring-primary" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">{competitor.name}</h3>
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                    DA {competitor.estimated_authority}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{competitor.domain}</p>
                <p className="text-xs text-muted-foreground">{competitor.publishing_frequency}</p>
                {competitor.articles_tracked > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">{competitor.articles_tracked} articles tracked</p>
                )}
              </div>
            ))}
          </div>

          {selected && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  {selected.name} — Strengths
                </h3>
                <div className="space-y-2">
                  {selected.strengths?.length > 0 ? selected.strengths.map((strength, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 border rounded-lg">
                      <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
                      <span className="text-sm">{strength}</span>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">No strengths recorded</p>}
                </div>
              </div>

              <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  {selected.name} — Weaknesses
                </h3>
                <div className="space-y-2">
                  {selected.weaknesses?.length > 0 ? selected.weaknesses.map((weakness, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 border rounded-lg">
                      <TrendingDown className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="text-sm">{weakness}</span>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">No weaknesses recorded</p>}
                </div>
              </div>
            </div>
          )}

          {selected && (
            <>
              <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  {selected.name} — Primary Categories
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selected.primary_categories?.length > 0 ? selected.primary_categories.map((cat, i) => (
                    <span key={i} className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium">
                      {cat.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  )) : <p className="text-sm text-muted-foreground">No categories recorded</p>}
                </div>
              </div>

              <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-purple-500" />
                  Content Gap Opportunities
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Based on {selected.name}&apos;s coverage, these are areas where TechPivo can differentiate:
                </p>
                <div className="space-y-2">
                  {selected.weaknesses?.length > 0 ? selected.weaknesses.map((weakness, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <span className="text-green-500 font-bold text-sm">{i + 1}</span>
                        </div>
                        <span className="text-sm font-medium capitalize">{weakness}</span>
                      </div>
                      <button className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90">
                        Create Brief
                      </button>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">No content gap opportunities available. Add more competitor data.</p>}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
