"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Lightbulb, Sparkles, RefreshCw, FileText, PenLine } from "lucide-react"
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
  rawVolume: number
}

export function AiOpportunityCenter() {
  const router = useRouter()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [busyTopic, setBusyTopic] = useState<string | null>(null)

  const generateOpportunities = useCallback(async () => {
    const supabase = createClient()

    const [keywordsRes, postsRes] = await Promise.all([
      supabase.from("keyword_articles").select("*").gte("search_volume", 100).order("search_volume", { ascending: false }).limit(25),
      supabase.from("posts").select("id, title, tags, seo_keywords").eq("status", "published").limit(100)
    ])

    const keywords = keywordsRes.data || []
    const posts = postsRes.data || []
    const existingTitles = posts.map(p => p.title?.toLowerCase() || "")
    const existingTags = posts.flatMap(p => (p.tags || []) as string[]).map((t: string) => t.toLowerCase())

    const opps: Opportunity[] = []

    keywords.slice(0, 12).forEach((kw, i) => {
      const keyword = (kw.keyword || "").trim()
      if (!keyword) return

      const searchDemand = Math.min(100, Math.max(10, (kw.search_volume || 1000) / 200))
      const competitionInv = Math.max(10, 100 - (kw.competition || 50))
      const covered =
        existingTitles.some(t => t.includes(keyword.toLowerCase())) ||
        existingTags.some(t => keyword.toLowerCase().includes(t))
      const existingCoverage = covered ? 20 : 80

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
        topic: keyword,
        score: score.score,
        searchVolume: formatVolume(kw.search_volume),
        competition: competitionInv > 70 ? "low" : competitionInv > 40 ? "medium" : "high",
        category: "Technology",
        priority: score.score >= 80 ? "high" : score.score >= 60 ? "medium" : "low",
        reason: covered ? "You have partial coverage — update and expand" : score.recommendation,
        rawVolume: kw.search_volume || 0,
      })
    })

    setOpportunities(opps.sort((a, b) => b.score - a.score).slice(0, 6))
    setLoading(false)
  }, [])

  useEffect(() => {
    generateOpportunities()
    const interval = setInterval(generateOpportunities, 60000)
    return () => clearInterval(interval)
  }, [generateOpportunities])

  const generateBrief = async (opp: Opportunity) => {
    setBusyTopic(opp.topic)
    try {
      const res = await fetch("/admin/editorial-intelligence/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: opp.topic, category: opp.category }),
      })
      if (!res.ok) throw new Error("Brief failed")
      const { plan } = await res.json()

      const supabase = createClient()
      const userRes = await supabase.auth.getUser()
      await supabase.from("content_briefs").insert({
        topic: opp.topic,
        category: opp.category,
        brief_data: plan || {},
        opportunity_score: opp.score,
        status: "generated",
        created_by: userRes.data?.user?.id || null,
      })

      router.push("/admin/editorial-intelligence/briefs")
    } catch (err) {
      console.error("Generate brief error:", err)
      setBusyTopic(null)
    }
  }

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
          <Button variant="ghost" size="sm" onClick={generateOpportunities} title="Refresh opportunities">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {opportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Lightbulb className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No keyword opportunities yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Opportunities appear when keywords with search volume are imported
            </p>
            <Button asChild size="sm" variant="outline" className="mt-4">
              <Link href="/admin/keywords">Import Keywords</Link>
            </Button>
          </div>
        ) : (
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
                  <Button asChild size="sm" variant="outline" className="text-xs">
                    <Link href={`/admin/editorial-intelligence/research?topic=${encodeURIComponent(opp.topic)}`}>
                      <Sparkles className="h-3 w-3 mr-1" />
                      Research
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => generateBrief(opp)}
                    disabled={busyTopic === opp.topic}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    {busyTopic === opp.topic ? "Generating..." : "Generate Brief"}
                  </Button>
                  <Button asChild size="sm" className="text-xs">
                    <Link href={`/admin/editorial-intelligence/generate?topic=${encodeURIComponent(opp.topic)}`}>
                      <PenLine className="h-3 w-3 mr-1" />
                      Generate Article
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
