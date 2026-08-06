"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Lightbulb, TrendingUp, Clock, ArrowRight, Sparkles, RefreshCw } from "lucide-react"
import { calculateOpportunityScore } from "@/lib/editorial-intelligence"

interface Opportunity {
  id: string
  topic: string
  score: number
  searchVolume: string
  competition: "low" | "medium" | "high"
  category: string
  priority: "high" | "medium" | "low"
  reason: string
}

export function AiOpportunityCenter() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)

  const generateOpportunities = useCallback(async () => {
    const supabase = createClient()
    
    const [keywordsRes, postsRes] = await Promise.all([
      supabase.from("keyword_articles").select("*").order("search_volume", { ascending: false }).limit(20),
      supabase.from("posts").select("id, title, tags, seo_keywords").eq("status", "published").limit(50)
    ])

    const keywords = keywordsRes.data || []
    const posts = postsRes.data || []
    const existingTitles = posts.map(p => p.title?.toLowerCase() || "")

    const opps: Opportunity[] = []

    keywords.slice(0, 10).forEach((kw, i) => {
      const searchDemand = Math.min(100, Math.max(10, (kw.search_volume || 1000) / 200))
      const competitionInv = Math.max(10, 100 - (kw.competition || 50))
      const existingCoverage = existingTitles.some(t => t.includes((kw.keyword || "").toLowerCase())) ? 20 : 80

      const score = calculateOpportunityScore({
        search_demand: searchDemand,
        trend_direction: (kw.trend_direction || 50) * 20,
        freshness: 70,
        competition_inverse: competitionInv,
        existing_coverage_inverse: existingCoverage,
        reader_interest: 50,
        business_value: searchDemand * 0.8,
        expertise: Math.round(searchDemand * 0.7),
      })

      opps.push({
        id: kw.id || `kw-${i}`,
        topic: kw.keyword || "Unknown Topic",
        score: score.score,
        searchVolume: formatVolume(kw.search_volume),
        competition: competitionInv > 70 ? "low" : competitionInv > 40 ? "medium" : "high",
        category: "Technology",
        priority: score.score >= 80 ? "high" : score.score >= 60 ? "medium" : "low",
        reason: score.recommendation
      })
    })

    setOpportunities(opps.sort((a, b) => b.score - a.score).slice(0, 6))
    setLoading(false)
  }, [])

  useEffect(() => { generateOpportunities() }, [generateOpportunities])

  const formatVolume = (vol: number | null | undefined): string => {
    if (!vol) return "1K-10K"
    if (vol >= 100000) return "100K+"
    if (vol >= 50000) return "50K-100K"
    if (vol >= 10000) return "10K-50K"
    if (vol >= 1000) return "1K-10K"
    return "Under 1K"
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50"
    if (score >= 60) return "text-yellow-600 bg-yellow-50"
    return "text-red-600 bg-red-50"
  }

  const getCompetitionBadge = (competition: string) => {
    switch (competition) {
      case "low": return <Badge className="bg-green-100 text-green-800">Low</Badge>
      case "medium": return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
      case "high": return <Badge variant="destructive">High</Badge>
      default: return <Badge variant="secondary">{competition}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high": return <Badge className="bg-purple-100 text-purple-800">High Priority</Badge>
      case "medium": return <Badge className="bg-blue-100 text-blue-800">Medium</Badge>
      default: return <Badge variant="secondary">Low</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Opportunity Center
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
            <Lightbulb className="h-5 w-5" />
            AI Opportunity Center
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={generateOpportunities}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {opportunities.map((opp) => (
            <div key={opp.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{opp.topic}</h4>
                    {getPriorityBadge(opp.priority)}
                  </div>
                  <p className="text-xs text-muted-foreground">{opp.reason}</p>
                </div>
                <div className={`text-lg font-bold px-2 py-1 rounded ${getScoreColor(opp.score)}`}>
                  {opp.score}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Volume: {opp.searchVolume}</span>
                <span className="text-muted-foreground">•</span>
                <span>Competition:</span>
                {getCompetitionBadge(opp.competition)}
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{opp.category}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Research
                </Button>
                <Button size="sm" variant="outline" className="text-xs">
                  Generate Brief
                </Button>
                <Button size="sm" className="text-xs">
                  Generate Article
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
