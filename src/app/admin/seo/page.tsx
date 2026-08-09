"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search, AlertTriangle, CheckCircle, TrendingUp, TrendingDown,
  FileText, Link, Image, Code, BarChart3, RefreshCw, Settings,
  Globe, Shield, Zap, Target, ExternalLink, Copy, Trash2, Plus, Eye, Clock,
  Loader2, ChevronDown, ChevronRight
} from "lucide-react"

interface SeoAudit {
  id: string
  post_id: string
  overall_score: number
  seo_score: number
  readability_score: number
  eeat_score: number
  media_score: number
  internal_linking_score: number
  external_links_score: number
  schema_score: number
  keyword_coverage_score: number
  technical_health_score: number
  freshness_score: number
  issues: any[]
  suggestions: any[]
  checked_at: string
  created_at?: string
}

interface KeywordRanking {
  id: string
  keyword: string
  post_id: string
  position: number | null
  previous_position: number | null
  search_volume: number | null
  difficulty: number | null
  url: string | null
  last_checked_at: string
}

interface SeoIssue {
  id: string
  post_id: string
  issue_type: string
  severity: string
  description: string
  suggestion: string
  resolved: boolean
  created_at: string
}

interface TopicAuthority {
  id: string
  category_id: string
  authority_score: number
  article_count: number
  avg_quality_score: number
  avg_seo_score: number
  category_name?: string
}

let realtimeSeq = 0

export default function EnterpriseSeoCenter() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [audits, setAudits] = useState<SeoAudit[]>([])
  const [keywords, setKeywords] = useState<KeywordRanking[]>([])
  const [issues, setIssues] = useState<SeoIssue[]>([])
  const [topicAuthority, setTopicAuthority] = useState<TopicAuthority[]>([])
  const [postsList, setPostsList] = useState<{ id: string; title: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [auditing, setAuditing] = useState(false)
  const [auditMsg, setAuditMsg] = useState("")
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null)
  const [newKeyword, setNewKeyword] = useState("")
  const [newKeywordPost, setNewKeywordPost] = useState("")
  const [stats, setStats] = useState({
    totalAudits: 0,
    avgScore: 0,
    indexedPosts: 0,
    pendingIssues: 0,
    trackedKeywords: 0,
    avgPosition: 0
  })

  const loadData = useCallback(async () => {
    const [auditsRes, keywordsRes, issuesRes, topicRes, postsRes, catRes] = await Promise.all([
      supabase.from("seo_audits").select("*").order("checked_at", { ascending: false }).limit(100),
      supabase.from("keyword_rankings").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("seo_issues").select("*").eq("resolved", false).order("created_at", { ascending: false }).limit(100),
      supabase.from("topic_authority").select("*").order("authority_score", { ascending: false }).limit(200),
      supabase.from("posts").select("id, title, status, google_indexed").eq("status", "published").limit(300),
      supabase.from("categories").select("id, name")
    ])

    if (auditsRes.data) setAudits(auditsRes.data)
    if (keywordsRes.data) setKeywords(keywordsRes.data)
    if (issuesRes.data) setIssues(issuesRes.data)
    if (postsRes.data) setPostsList(postsRes.data.map(p => ({ id: p.id, title: p.title })))

    const catMap: Record<string, string> = {}
    catRes.data?.forEach((c: any) => { catMap[c.id] = c.name })
    let topics: TopicAuthority[] = topicRes.data || []
    if (topics.length === 0) {
      const { data: postsAgg } = await supabase.from("posts")
        .select("category_id, seo_score, quality_score").eq("status", "published").limit(500)
      const grouped: Record<string, { count: number; seo: number[]; q: number[] }> = {}
      ;(postsAgg || []).forEach((p: any) => {
        if (!p.category_id) return
        grouped[p.category_id] = grouped[p.category_id] || { count: 0, seo: [], q: [] }
        grouped[p.category_id].count++
        if (p.seo_score) grouped[p.category_id].seo.push(p.seo_score)
        if (p.quality_score) grouped[p.category_id].q.push(p.quality_score)
      })
      topics = Object.entries(grouped).map(([cid, g]) => {
        const avgSeo = g.seo.length ? Math.round(g.seo.reduce((a, b) => a + b, 0) / g.seo.length) : 0
        const avgQ = g.q.length ? Math.round(g.q.reduce((a, b) => a + b, 0) / g.q.length) : 0
        const authority = avgSeo || avgQ ? Math.round((avgSeo + avgQ) / 2) : Math.min(55 + g.count * 2, 95)
        return {
          id: cid, category_id: cid, category_name: catMap[cid] || cid,
          article_count: g.count, avg_quality_score: avgQ, avg_seo_score: avgSeo, authority_score: authority,
        }
      }).sort((a, b) => b.authority_score - a.authority_score)
    }
    setTopicAuthority(topics.map(t => ({ ...t, category_name: t.category_name || catMap[t.category_id] || t.category_id })))

    const totalAudits = auditsRes.data?.length || 0
    const avgScore = totalAudits > 0
      ? Math.round(auditsRes.data!.reduce((sum, a) => sum + a.overall_score, 0) / totalAudits)
      : 0
    const indexedPosts = postsRes.data?.filter(p => p.google_indexed).length || 0
    const pendingIssues = issuesRes.data?.length || 0
    const trackedKeywords = keywordsRes.data?.length || 0
    const positioned = (keywordsRes.data || []).filter(k => k.position)
    const avgPosition = positioned.length
      ? Math.round(positioned.reduce((sum, k) => sum + (k.position || 0), 0) / positioned.length)
      : 0

    setStats({ totalAudits, avgScore, indexedPosts, pendingIssues, trackedKeywords, avgPosition })
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    let mounted = true
    const tables = ["seo_audits", "seo_issues", "keyword_rankings", "topic_authority", "seo_redirects"]
    const channels = tables.map((t, i) =>
      supabase
        .channel(`seo_center_rt_${realtimeSeq++}_${i}_${t}`)
        .on("postgres_changes", { event: "*", schema: "public", table: t }, () => {
          if (mounted) loadData()
        })
        .subscribe()
    )
    const poll = setInterval(() => { if (mounted) loadData() }, 30000)
    const onFocus = () => { if (mounted) loadData() }
    window.addEventListener("focus", onFocus)
    return () => {
      mounted = false
      channels.forEach(c => supabase.removeChannel(c))
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
    }
  }, [supabase, loadData])

  const runSeoAudit = async (postId: string) => {
    if (auditing) return
    setAuditing(true)
    setAuditMsg("")
    try {
      const res = await fetch("/api/admin/seo/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId })
      })
      if (res.ok) {
        const data = await res.json()
        setAuditMsg(data.audited !== undefined ? `Audited ${data.audited} of ${data.total} posts` : "Audit complete")
        await loadData()
      } else {
        const err = await res.json().catch(() => ({}))
        setAuditMsg(`Audit failed: ${err.error || res.status}`)
      }
    } catch (e) {
      setAuditMsg(`Audit failed: ${String(e)}`)
    }
    setAuditing(false)
  }

  const resolveIssue = async (issueId: string) => {
    await supabase.from("seo_issues").update({ resolved: true, resolved_at: new Date().toISOString() }).eq("id", issueId)
    loadData()
  }

  const addKeyword = async () => {
    if (!newKeyword.trim()) return
    const { data } = await supabase.from("keyword_rankings").insert({
      keyword: newKeyword.trim(),
      post_id: newKeywordPost || null,
    }).select().single()
    if (data) {
      setKeywords(prev => [data as KeywordRanking, ...prev])
      setNewKeyword("")
      setNewKeywordPost("")
    }
  }

  const deleteKeyword = async (id: string) => {
    await supabase.from("keyword_rankings").delete().eq("id", id)
    setKeywords(k => k.filter(x => x.id !== id))
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50"
    if (score >= 70) return "text-yellow-600 bg-yellow-50"
    return "text-red-600 bg-red-50"
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical": return <Badge variant="destructive">Critical</Badge>
      case "warning": return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Warning</Badge>
      case "info": return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Info</Badge>
      default: return <Badge variant="secondary">{severity}</Badge>
    }
  }

  const getTrendIcon = (current: number | null, previous: number | null) => {
    if (!current || !previous) return null
    if (current < previous) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (current > previous) return <TrendingDown className="h-4 w-4 text-red-600" />
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Enterprise SEO Center</h1>
          <p className="text-muted-foreground">Optimize, monitor, and improve your search performance</p>
        </div>
        <div className="flex items-center gap-3">
          {auditMsg && (
            <span className="text-sm text-muted-foreground">{auditMsg}</span>
          )}
          <Button onClick={() => runSeoAudit("all")} disabled={auditing}>
            {auditing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {auditing ? "Auditing..." : "Run Full Audit"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="audit">SEO Audit</TabsTrigger>
          <TabsTrigger value="keywords">Keyword Tracking</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="internal-links">Internal Links</TabsTrigger>
          <TabsTrigger value="schema">Schema</TabsTrigger>
          <TabsTrigger value="technical">Technical SEO</TabsTrigger>
          <TabsTrigger value="authority">Topic Authority</TabsTrigger>
          <TabsTrigger value="redirects">Redirects</TabsTrigger>
          <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
          <TabsTrigger value="content-decay">Content Decay</TabsTrigger>
          <TabsTrigger value="robots">Robots.txt</TabsTrigger>
          <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
          <TabsTrigger value="cwv">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="image-seo">Image SEO</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Average SEO Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(stats.avgScore)}`}>{loading ? "..." : `${stats.avgScore}%`}</p>
                  </div>
                  <div className={`p-2 rounded-full ${getScoreColor(stats.avgScore)}`}>
                    <Target className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Indexed Posts</p>
                    <p className="text-2xl font-bold">{loading ? "..." : stats.indexedPosts}</p>
                  </div>
                  <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                    <Globe className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Issues</p>
                    <p className={`text-2xl font-bold ${stats.pendingIssues > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {loading ? "..." : stats.pendingIssues}
                    </p>
                  </div>
                  <div className={`p-2 rounded-full ${stats.pendingIssues > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Keyword Position</p>
                    <p className="text-2xl font-bold">{loading ? "..." : (stats.avgPosition || '-')}</p>
                  </div>
                  <div className="p-2 rounded-full bg-purple-50 text-purple-600">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Topic Authority by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
              ) : topicAuthority.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No category data yet. Run a full audit to generate topic authority scores.
                </p>
              ) : (
                <div className="space-y-4">
                  {topicAuthority.slice(0, 8).map((topic) => (
                    <div key={topic.id} className="flex flex-wrap items-center justify-between gap-3 p-3 border rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Target className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{topic.category_name}</p>
                          <p className="text-sm text-muted-foreground">{topic.article_count} articles</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Authority</p>
                          <p className={`font-bold ${getScoreColor(topic.authority_score)}`}>{topic.authority_score}%</p>
                        </div>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2"
                            style={{ width: `${topic.authority_score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent SEO Issues</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
              ) : issues.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No pending issues</p>
              ) : (
                <div className="space-y-3">
                  {issues.slice(0, 5).map((issue) => (
                    <div key={issue.id} className="flex flex-wrap items-center justify-between gap-2 p-3 border rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        {getSeverityBadge(issue.severity)}
                        <div className="min-w-0">
                          <p className="font-medium">{issue.issue_type}</p>
                          <p className="text-sm text-muted-foreground truncate">{issue.description}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => resolveIssue(issue.id)}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SEO Audit Results</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8"><p className="text-muted-foreground">Loading...</p></div>
              ) : audits.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No audits performed yet</p>
                  <Button onClick={() => runSeoAudit("all")} disabled={auditing}>
                    {auditing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    {auditing ? "Auditing..." : "Run First Audit"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {audits.map((audit) => (
                    <div key={audit.id} className="border rounded-lg p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`text-2xl font-bold ${getScoreColor(audit.overall_score)}`}>
                            {audit.overall_score}
                          </div>
                          <div>
                            <p className="font-medium">Overall Score</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(audit.checked_at || audit.created_at || Date.now()).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setExpandedAudit(expandedAudit === audit.id ? null : audit.id)}>
                          {expandedAudit === audit.id ? <ChevronUpIcon className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                          {expandedAudit === audit.id ? "Hide Details" : "View Details"}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {[
                          { label: "SEO", score: audit.seo_score },
                          { label: "Readability", score: audit.readability_score },
                          { label: "EEAT", score: audit.eeat_score },
                          { label: "Media", score: audit.media_score },
                          { label: "Links", score: audit.internal_linking_score },
                          { label: "Schema", score: audit.schema_score }
                        ].map((item) => (
                          <div key={item.label} className="text-center p-2 border rounded">
                            <p className={`text-lg font-bold ${getScoreColor(item.score)}`}>{item.score}</p>
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                          </div>
                        ))}
                      </div>
                      {expandedAudit === audit.id && (
                        <div className="mt-4 space-y-4 border-t pt-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {[
                              { label: "External Links", score: audit.external_links_score },
                              { label: "Keyword Coverage", score: audit.keyword_coverage_score },
                              { label: "Technical Health", score: audit.technical_health_score },
                              { label: "Freshness", score: audit.freshness_score },
                              { label: "Internal Links", score: audit.internal_linking_score },
                            ].map((item) => (
                              <div key={item.label} className="text-center p-2 border rounded bg-muted/20">
                                <p className={`text-lg font-bold ${getScoreColor(item.score)}`}>{item.score}</p>
                                <p className="text-xs text-muted-foreground">{item.label}</p>
                              </div>
                            ))}
                          </div>
                          {Array.isArray(audit.issues) && audit.issues.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Found Issues</h4>
                              <div className="space-y-2">
                                {audit.issues.map((iss: any, i: number) => (
                                  <div key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-red-50/50 border border-red-100">
                                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                    <div>
                                      <span className="font-medium">{iss.issue_type}</span>
                                      <span className="text-muted-foreground"> — {iss.description}</span>
                                      {iss.suggestion && <p className="text-xs text-blue-600 mt-0.5">Suggestion: {iss.suggestion}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keywords" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Keyword Rankings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="Add keyword to track (e.g., ai tutorials)"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                  className="flex-1 min-w-[200px]"
                />
                <select
                  value={newKeywordPost}
                  onChange={(e) => setNewKeywordPost(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm flex-1 min-w-[180px] max-w-[320px]"
                >
                  <option value="">No linked post</option>
                  {postsList.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <Button onClick={addKeyword} disabled={!newKeyword.trim()}>
                  <Plus className="h-4 w-4 mr-1" /> Track
                </Button>
              </div>
              {keywords.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No keywords tracked yet. Add your first keyword above.
                </p>
              ) : (
                <div className="space-y-3">
                  {keywords.map((kw) => (
                    <div key={kw.id} className="flex flex-wrap items-center justify-between gap-2 p-3 border rounded-lg">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-lg font-bold text-primary">
                            {kw.position || '-'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{kw.keyword}</p>
                          <p className="text-sm text-muted-foreground">
                            Volume: {kw.search_volume || 'N/A'} | Difficulty: {kw.difficulty || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {getTrendIcon(kw.position, kw.previous_position)}
                        <Badge variant={kw.position && kw.position <= 10 ? "default" : "secondary"}>
                          {kw.position ? `#${kw.position}` : 'Untracked'}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => deleteKeyword(kw.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SEO Issues</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-center py-4">Loading...</p>
              ) : issues.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No issues found</p>
              ) : (
                <div className="space-y-3">
                  {issues.map((issue) => (
                    <div key={issue.id} className="flex flex-wrap items-center justify-between gap-2 p-3 border rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        {getSeverityBadge(issue.severity)}
                        <div className="min-w-0">
                          <p className="font-medium">{issue.issue_type}</p>
                          <p className="text-sm text-muted-foreground">{issue.description}</p>
                          {issue.suggestion && (
                            <p className="text-sm text-blue-600 mt-1">Suggestion: {issue.suggestion}</p>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => resolveIssue(issue.id)}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Resolve
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="internal-links" className="space-y-6">
          <InternalLinksTab />
        </TabsContent>

        <TabsContent value="schema" className="space-y-6">
          <SchemaTab />
        </TabsContent>

        <TabsContent value="technical" className="space-y-6">
          <TechnicalSeoTab />
        </TabsContent>

        <TabsContent value="authority" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Topic Authority Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
              ) : topicAuthority.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
              ) : (
                <div className="space-y-4">
                  {topicAuthority.map((topic) => (
                    <div key={topic.id} className="flex flex-wrap items-center justify-between gap-3 p-4 border rounded-lg">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Target className="h-6 w-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-lg truncate">{topic.category_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {topic.article_count} articles | Avg Quality: {topic.avg_quality_score} | Avg SEO: {topic.avg_seo_score}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Authority Score</p>
                          <p className={`text-2xl font-bold ${getScoreColor(topic.authority_score)}`}>
                            {topic.authority_score}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SeoSettingsTab />
        </TabsContent>

        <TabsContent value="redirects" className="space-y-6">
          <RedirectsTab />
        </TabsContent>

        <TabsContent value="duplicates" className="space-y-6">
          <DuplicatesTab />
        </TabsContent>

        <TabsContent value="content-decay" className="space-y-6">
          <ContentDecayTab />
        </TabsContent>

        <TabsContent value="robots" className="space-y-6">
          <RobotsTab />
        </TabsContent>

        <TabsContent value="sitemap" className="space-y-6">
          <SitemapTab />
        </TabsContent>

        <TabsContent value="cwv" className="space-y-6">
          <CoreWebVitalsTab />
        </TabsContent>

        <TabsContent value="image-seo" className="space-y-6">
          <ImageSeoTab />
        </TabsContent>

      </Tabs>
    </div>
  )
}

function ChevronUpIcon({ className }: { className?: string }) {
  return <ChevronDown className={`${className} rotate-180`} />
}

function InternalLinksTab() {
  const supabase = createClient()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("posts").select("id, title, slug, content").eq("status", "published").limit(50)
        if (data) setPosts(data)
      } catch (err) { console.error("Failed to fetch internal links:", err) }
      setLoading(false)
    })()
  }, [supabase])

  return (
    <Card>
      <CardHeader><CardTitle>Internal Link Intelligence</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-3">
            {posts.slice(0, 10).map((post) => (
              <div key={post.id} className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm truncate">{post.title}</p>
                  <a href={`/admin/posts/${post.id}/edit`} className="text-xs text-blue-600 hover:underline shrink-0">Edit →</a>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Content length: {post.content?.length || 0} chars · Slug: /{post.slug} · Internal links: {((post.content || "").match(/<a[^>]+href="\/(?!https?:)[^"]+"/gi) || []).length}
                </p>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">Showing {Math.min(posts.length, 10)} of {posts.length} published posts. Use the post editor to add internal links.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SchemaTab() {
  const supabase = createClient()
  const [schemaType, setSchemaType] = useState("Article")
  const [postSlug, setPostSlug] = useState("")
  const [generated, setGenerated] = useState("")
  const [savedTemplates, setSavedTemplates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState("")

  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", "schema_templates").single().then(({ data }) => {
      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value)
          if (Array.isArray(parsed)) setSavedTemplates(parsed)
        } catch {}
      }
      setLoading(false)
    })
  }, [supabase])

  const generateSchema = () => {
    const base: any = {
      "@context": "https://schema.org",
      "@type": schemaType,
    }
    if (postSlug) {
      const url = typeof window !== "undefined" ? `${window.location.origin}/${postSlug}` : `https://techpivo.com/${postSlug}`
      base.url = url
      base.mainEntityOfPage = url
    }
    if (schemaType === "FAQPage") {
      base.mainEntity = [
        { "@type": "Question", name: "", acceptedAnswer: { "@type": "Answer", text: "" } },
        { "@type": "Question", name: "", acceptedAnswer: { "@type": "Answer", text: "" } },
      ]
    }
    if (schemaType === "HowTo") {
      base.name = ""
      base.step = [{ "@type": "HowToStep", name: "", text: "" }]
    }
    setGenerated(JSON.stringify(base, null, 2))
  }

  const saveAsTemplate = async () => {
    if (!generated) return
    setSaveStatus("saving")
    const updated = [...savedTemplates, generated]
    await supabase.from("site_settings").upsert({ key: "schema_templates", value: JSON.stringify(updated) }, { onConflict: "key" })
    setSavedTemplates(updated)
    setSaveStatus("saved")
    setTimeout(() => setSaveStatus(""), 2000)
  }

  const loadTemplate = (tmpl: string) => {
    setGenerated(tmpl)
    try {
      const parsed = JSON.parse(tmpl)
      if (parsed["@type"]) setSchemaType(parsed["@type"])
    } catch {}
  }

  const deleteTemplate = async (idx: number) => {
    const updated = savedTemplates.filter((_, i) => i !== idx)
    await supabase.from("site_settings").upsert({ key: "schema_templates", value: JSON.stringify(updated) }, { onConflict: "key" })
    setSavedTemplates(updated)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Schema Generator</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">Recommended schema types for your content:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {[
              { type: "Article", desc: "Standard blog posts" },
              { type: "NewsArticle", desc: "Breaking news content" },
              { type: "BlogPosting", desc: "Blog-style articles" },
              { type: "FAQPage", desc: "Articles with FAQs" },
              { type: "HowTo", desc: "Tutorials and guides" },
              { type: "Review", desc: "Product reviews" },
            ].map((s) => (
              <div key={s.type} className="p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">{s.type}</p>
                  <Badge variant="default" className="text-[10px]">Recommended</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-lg bg-muted/30 space-y-3">
            <h4 className="text-sm font-medium">Quick Schema Generator</h4>
            <div className="flex gap-2 flex-wrap">
              <select value={schemaType} onChange={e => setSchemaType(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                {["Article", "NewsArticle", "BlogPosting", "FAQPage", "HowTo", "Review"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <Input placeholder="Post slug (optional)" value={postSlug} onChange={e => setPostSlug(e.target.value)} className="w-48" />
              <Button size="sm" onClick={generateSchema}>Generate</Button>
            </div>
            {generated && (
              <div className="relative">
                <pre className="text-xs bg-background p-3 rounded-lg overflow-x-auto max-h-48">{generated}</pre>
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(generated) }}><Copy className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="sm" onClick={saveAsTemplate}>{saveStatus === "saved" ? "Saved!" : "Save"}</Button>
                </div>
              </div>
            )}
          </div>
          {!loading && savedTemplates.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Saved Templates</h4>
              {savedTemplates.map((tmpl, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/20 text-sm">
                  <span className="font-mono text-xs truncate flex-1">{tmpl.slice(0, 80)}...</span>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => loadTemplate(tmpl)}><Eye className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteTemplate(idx)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Schema markup is automatically generated for your articles on the frontend. Use this tool to preview or generate custom schema for special cases.</p>
        </CardContent>
      </Card>
    </div>
  )
}

function RedirectsTab() {
  const supabase = createClient()
  const [redirects, setRedirects] = useState<{ id?: string; source_url: string; target_url: string; status_code: number }[]>([])
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from("seo_redirects").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setRedirects(data)
      setLoading(false)
    })
  }, [supabase])

  const saveRedirect = async (fromUrl: string, toUrl: string) => {
    const { data } = await supabase.from("seo_redirects").insert({ source_url: fromUrl, target_url: toUrl, status_code: 301 }).select().single()
    if (data) setRedirects(prev => [data, ...prev])
  }

  const addRedirect = () => {
    if (!from || !to) return
    saveRedirect(from, to)
    setFrom("")
    setTo("")
  }

  const removeRedirect = async (id: string) => {
    await supabase.from("seo_redirects").delete().eq("id", id)
    setRedirects(redirects.filter(r => r.id !== id))
  }

  return (
    <Card>
      <CardHeader><CardTitle>Redirect Manager</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="Source URL (e.g., /old-page)" value={from} onChange={(e) => setFrom(e.target.value)} className="flex-1 min-w-[150px]" />
          <Input placeholder="Target URL (e.g., /new-page)" value={to} onChange={(e) => setTo(e.target.value)} className="flex-1 min-w-[150px]" />
          <Button onClick={addRedirect} disabled={!from || !to}><Plus className="h-4 w-4 mr-1" /> Add Redirect</Button>
        </div>
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading redirects...</p>
          ) : redirects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No redirects configured. Add your first redirect above.</p>
          ) : (
            redirects.map((r) => (
              <div key={r.id || r.source_url} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-muted/30 text-sm">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <Badge variant="outline">{r.status_code?.toString() || "301"}</Badge>
                  <span className="font-mono text-xs">{r.source_url}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-mono text-xs">{r.target_url}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeRedirect(r.id!)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function DuplicatesTab() {
  const supabase = createClient()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("posts").select("id, title, slug").eq("status", "published").limit(200)
        if (data) setPosts(data)
      } catch (err) { console.error("Failed to fetch duplicates:", err) }
      setLoading(false)
    })()
  }, [supabase])

  const getBigrams = (s: string): Set<string> => {
    const tokens = s.toLowerCase().split(/\s+/).filter(Boolean)
    const bigrams = new Set<string>()
    for (let i = 0; i < tokens.length - 1; i++) {
      bigrams.add(`${tokens[i]} ${tokens[i + 1]}`)
    }
    return bigrams
  }

  const findSimilar = (title: string, allPosts: any[]) => {
    const words = title.toLowerCase().split(/\s+/).filter(Boolean)
    const titleBigrams = getBigrams(title)
    return allPosts.filter(p => {
      if (p.title === title) return false
      const pWords = p.title.toLowerCase().split(/\s+/).filter(Boolean)
      const wordOverlap = words.filter(w => pWords.includes(w)).length
      const pBigrams = getBigrams(p.title)
      let bigramOverlap = 0
      titleBigrams.forEach(b => { if (pBigrams.has(b)) bigramOverlap++ })
      const unionSize = new Set([...titleBigrams, ...pBigrams]).size
      const jaccard = unionSize > 0 ? bigramOverlap / unionSize : 0
      const wordMatchRatio = Math.max(words.length, pWords.length) > 0
        ? wordOverlap / Math.max(words.length, pWords.length)
        : 0
      return (wordOverlap >= 4 && wordMatchRatio >= 0.4) || jaccard >= 0.3
    }).slice(0, 3)
  }

  return (
    <Card>
      <CardHeader><CardTitle>Duplicate Content Detection</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-3">
            {posts.slice(0, 10).map((post) => {
              const similar = findSimilar(post.title, posts)
              if (similar.length === 0) return null
              return (
                <div key={post.id} className="p-3 rounded-lg bg-muted/30">
                  <Badge variant="outline" className="mb-2">Possible Duplicate</Badge>
                  <p className="font-medium text-sm mb-1">{post.title}</p>
                  <div className="space-y-1">
                    {similar.map((s) => (
                      <div key={s.id} className="text-xs text-muted-foreground pl-3 border-l-2 border-muted">
                        {s.title}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-muted-foreground mt-2">{posts.length} articles scanned. Articles with similar titles are flagged above.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ContentDecayTab() {
  const supabase = createClient()
  const [decayingPosts, setDecayingPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDecay = async () => {
      try {
        const { data } = await supabase.from("posts").select("id, title, slug, views, updated_at, published_at")
          .eq("status", "published").order("updated_at", { ascending: true }).limit(100)

        if (data) {
          const now = Date.now()
          const decaying = data.filter(p => {
            const daysSinceUpdate = (now - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24)
            return daysSinceUpdate > 90 || (p.views || 0) < 100
          }).slice(0, 10)
          setDecayingPosts(decaying)
        }
      } catch (err) { console.error("Failed to fetch content decay:", err) }
      setLoading(false)
    }
    fetchDecay()
  }, [supabase])

  return (
    <Card>
      <CardHeader><CardTitle>Content Decay Monitor</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : decayingPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No decaying content found. All articles appear healthy.</p>
        ) : (
          decayingPosts.map((p) => {
            const daysSinceUpdate = Math.floor((Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24))
            return (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-muted/30">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{daysSinceUpdate} days since update · {p.views || 0} views</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={daysSinceUpdate > 180 ? "destructive" : "secondary"}>
                    {daysSinceUpdate > 180 ? "Stale" : "Aging"}
                  </Badge>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/admin/posts/${p.id}/edit`}>Refresh</a>
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

function TechnicalSeoTab() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [techStats, setTechStats] = useState({
    totalPosts: 0,
    indexedPosts: 0,
    totalRedirects: 0,
    pendingIssues: 0,
    auditsPerformed: 0,
    avgTechnicalScore: 0,
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [postsRes, indexedRes, redirectsRes, issuesRes, auditsRes] = await Promise.all([
          supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
          supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published").eq("google_indexed", true),
          supabase.from("seo_redirects").select("*", { count: "exact", head: true }),
          supabase.from("seo_issues").select("*", { count: "exact", head: true }).eq("resolved", false),
          supabase.from("seo_audits").select("technical_health_score").limit(100),
        ])

        const audits = auditsRes.data || []
        const avgTech = audits.length > 0
          ? Math.round(audits.reduce((s, a) => s + (a.technical_health_score || 0), 0) / audits.length)
          : 0

        setTechStats({
          totalPosts: postsRes.count || 0,
          indexedPosts: indexedRes.count || 0,
          totalRedirects: redirectsRes.count || 0,
          pendingIssues: issuesRes.count || 0,
          auditsPerformed: audits.length,
          avgTechnicalScore: avgTech,
        })
      } catch (err) { console.error("Failed to fetch technical SEO data:", err) }
      setLoading(false)
    }
    fetchData()
  }, [supabase])

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium">Published Posts</h3>
          </div>
          <p className="text-2xl font-bold">{techStats.totalPosts}</p>
          <p className="text-sm text-muted-foreground">{techStats.indexedPosts} indexed ({techStats.totalPosts ? Math.round(techStats.indexedPosts / techStats.totalPosts * 100) : 0}%)</p>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Link className="h-5 w-5 text-green-600" />
            <h3 className="font-medium">Redirects</h3>
          </div>
          <p className="text-2xl font-bold">{techStats.totalRedirects}</p>
          <p className="text-sm text-muted-foreground">301 redirects configured</p>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-purple-600" />
            <h3 className="font-medium">Sitemap Coverage</h3>
          </div>
          <p className="text-2xl font-bold">{techStats.totalPosts}</p>
          <p className="text-sm text-muted-foreground">URLs in sitemap</p>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="font-medium">Pending Issues</h3>
          </div>
          <p className={`text-2xl font-bold ${techStats.pendingIssues > 0 ? "text-red-600" : "text-green-600"}`}>{techStats.pendingIssues}</p>
          <p className="text-sm text-muted-foreground">Unresolved SEO issues</p>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-orange-600" />
            <h3 className="font-medium">Technical Health</h3>
          </div>
          <p className={`text-2xl font-bold ${techStats.avgTechnicalScore >= 70 ? "text-green-600" : techStats.avgTechnicalScore >= 50 ? "text-yellow-600" : "text-red-600"}`}>
            {techStats.avgTechnicalScore || "N/A"}%
          </p>
          <p className="text-sm text-muted-foreground">Avg from {techStats.auditsPerformed} audits</p>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            <h3 className="font-medium">SEO Audits</h3>
          </div>
          <p className="text-2xl font-bold">{techStats.auditsPerformed}</p>
          <p className="text-sm text-muted-foreground">Audits performed</p>
        </div>
      </div>
    </div>
  )
}

function RobotsTab() {
  const [robotsContent, setRobotsContent] = useState("")
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://techpivo.com"

  useEffect(() => {
    const supabase = createClient()
    supabase.from("site_settings").select("value").eq("key", "robots_txt").single().then(({ data }) => {
      if (data?.value) {
        setRobotsContent(data.value)
      } else {
        setRobotsContent(
          `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nUser-agent: GPTBot\nDisallow: /\n\nSitemap: ${siteUrl}/sitemap.xml`
        )
      }
      setLoading(false)
    })
  }, [siteUrl])

  const handleSave = async () => {
    const supabase = createClient()
    await supabase.from("site_settings").upsert({ key: "robots_txt", value: robotsContent }, { onConflict: "key" })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card>
      <CardHeader><CardTitle>Robots.txt Manager</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <>
            <textarea
              className="w-full h-48 p-3 font-mono text-sm border rounded-lg bg-muted/30"
              value={robotsContent}
              onChange={(e) => setRobotsContent(e.target.value)}
            />
            <div className="flex gap-2 mt-3">
              <Button onClick={handleSave}>{saved ? "Saved!" : "Save Robots.txt"}</Button>
              <Button variant="outline" onClick={() => setShowPreview(v => !v)}>
                <Eye className="h-4 w-4 mr-2" /> {showPreview ? "Hide Preview" : "Preview"}
              </Button>
            </div>
            {showPreview && (
              <pre className="mt-3 p-3 font-mono text-xs bg-background border rounded-lg whitespace-pre-wrap">{robotsContent}</pre>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Saved content is served live at <a href="/robots.txt" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{siteUrl}/robots.txt</a>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function SitemapTab() {
  const supabase = createClient()
  const [stats, setStats] = useState({ total: 0, indexed: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSitemap = async () => {
      try {
        const { count: total } = await supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published")
        const { count: indexed } = await supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published").eq("google_indexed", true)
        setStats({ total: total || 0, indexed: indexed || 0 })
      } catch (err) { console.error("Failed to fetch sitemap stats:", err) }
      setLoading(false)
    }
    fetchSitemap()
  }, [supabase])

  return (
    <Card>
      <CardHeader><CardTitle>Sitemap Manager</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total URLs", value: loading ? "..." : stats.total.toLocaleString() },
            { label: "Published", value: loading ? "..." : stats.total.toLocaleString() },
            { label: "Indexed", value: loading ? "..." : stats.indexed.toLocaleString() },
            { label: "Pending", value: loading ? "..." : (stats.total - stats.indexed).toLocaleString() },
          ].map((s, i) => (
            <div key={i} className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-muted/30 text-sm">
            <span className="font-mono text-xs truncate">{`${typeof window !== "undefined" ? window.location.origin : "https://techpivo.com"}/sitemap.xml`}</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{stats.total} pages</span>
              <Badge variant="default">Active</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SeoSettingsTab() {
  const supabase = createClient()
  const [settings, setSettings] = useState({ default_meta: '', default_og_image: '', gsc_verification: '', bing_verification: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('site_settings').select('key, value').in('key', ['default_meta_description', 'default_og_image', 'gsc_verification_code', 'bing_verification_code']).then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {}
        data.forEach((s: any) => { map[s.key] = s.value })
        setSettings({
          default_meta: map.default_meta_description || '',
          default_og_image: map.default_og_image || '',
          gsc_verification: map.gsc_verification_code || '',
          bing_verification: map.bing_verification_code || '',
        })
      }
    })
  }, [supabase])

  const handleSave = async () => {
    setSaving(true)
    const entries = [
      { key: 'default_meta_description', value: settings.default_meta },
      { key: 'default_og_image', value: settings.default_og_image },
      { key: 'gsc_verification_code', value: settings.gsc_verification },
      { key: 'bing_verification_code', value: settings.bing_verification },
    ]
    for (const entry of entries) {
      await supabase.from('site_settings').upsert(entry, { onConflict: 'key' })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Default Meta Description</label>
            <Input placeholder="Enter default meta description" className="mt-1" value={settings.default_meta} onChange={e => setSettings({ ...settings, default_meta: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">Default OG Image</label>
            <Input placeholder="Enter default OG image URL" className="mt-1" value={settings.default_og_image} onChange={e => setSettings({ ...settings, default_og_image: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">Google Search Console Verification</label>
            <Input placeholder="Enter verification code" className="mt-1" value={settings.gsc_verification} onChange={e => setSettings({ ...settings, gsc_verification: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">Bing Webmaster Verification</label>
            <Input placeholder="Enter verification code" className="mt-1" value={settings.bing_verification} onChange={e => setSettings({ ...settings, bing_verification: e.target.value })} />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}</Button>
      </CardContent>
    </Card>
  )
}

function CoreWebVitalsTab() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [hasData, setHasData] = useState(false)

  useEffect(() => {
    const checkData = async () => {
      try {
        const { count: auditCount } = await supabase.from("seo_audits").select("*", { count: "exact", head: true }).limit(1)
        const hasAuditData = (auditCount || 0) > 0
        const { data: rumSetting } = await supabase.from("site_settings").select("value").eq("key", "rum_web_vitals_enabled").single()
        const rumEnabled = rumSetting?.value === true || rumSetting?.value === "true"
        setHasData(hasAuditData || rumEnabled)
      } catch (err) {
        console.error("Failed to check vitals data:", err)
      }
      setLoading(false)
    }
    checkData()
  }, [supabase])

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  if (!hasData) {
    return (
      <div className="bg-muted/30 border border-border rounded-lg p-8 text-center space-y-3">
        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
        <h3 className="font-medium text-lg">No Core Web Vitals Data Yet</h3>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Core Web Vitals require a Real User Monitoring (RUM) integration to collect real visitor data.
          Add the <code className="bg-muted px-1.5 rounded text-xs">web-vitals</code> library to your frontend
          and set <code className="bg-muted px-1.5 rounded text-xs">rum_web_vitals_enabled</code> to true in Site Settings.
        </p>
        <p className="text-xs text-muted-foreground">
          Once configured, LCP (target: &lt; 2.5s), INP (target: &lt; 200ms), and CLS (target: &lt; 0.1) will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        { metric: "LCP", target: "< 2.5s" },
        { metric: "INP", target: "< 200ms" },
        { metric: "CLS", target: "< 0.1" },
      ].map((m, i) => (
        <Card key={i}>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">{m.metric}</p>
            <p className="text-3xl font-bold text-yellow-500">&mdash;</p>
            <Badge variant="outline" className="mt-1">Collecting Data</Badge>
            <p className="text-xs text-muted-foreground mt-1">Target: {m.target}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ImageSeoTab() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [imageStats, setImageStats] = useState({
    total: 0,
    missingFeatured: 0,
    noImagesInContent: 0,
    withImages: 0,
  })

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const { data } = await supabase.from("posts").select("featured_image, content")
          .eq("status", "published").limit(300)

        const posts = data || []
        let missingFeatured = 0
        let noImagesInContent = 0

        posts.forEach((p) => {
          if (!p.featured_image) missingFeatured++
          const content = p.content || ""
          const imgTagCount = (content.match(/<img[^>]+>/gi) || []).length
          const mdImgCount = (content.match(/!\[.*?\]\(.*?\)/g) || []).length
          if (imgTagCount === 0 && mdImgCount === 0) noImagesInContent++
        })

        setImageStats({
          total: posts.length,
          missingFeatured,
          noImagesInContent,
          withImages: posts.length - noImagesInContent,
        })
      } catch (err) { console.error("Failed to fetch image SEO data:", err) }
      setLoading(false)
    }
    fetchImages()
  }, [supabase])

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg text-center">
          <p className="text-2xl font-bold">{imageStats.total}</p>
          <p className="text-sm text-muted-foreground">Articles Scanned</p>
        </div>
        <div className="p-4 border rounded-lg text-center">
          <p className={`text-2xl font-bold ${imageStats.missingFeatured > 0 ? "text-yellow-600" : "text-green-600"}`}>{imageStats.missingFeatured}</p>
          <p className="text-sm text-muted-foreground">Missing Featured Image</p>
        </div>
        <div className="p-4 border rounded-lg text-center">
          <p className={`text-2xl font-bold ${imageStats.noImagesInContent > 0 ? "text-red-600" : "text-green-600"}`}>{imageStats.noImagesInContent}</p>
          <p className="text-sm text-muted-foreground">No Images in Content</p>
        </div>
        <div className="p-4 border rounded-lg text-center">
          <p className={`text-2xl font-bold ${imageStats.total > 0 ? "text-green-600" : "text-muted-foreground"}`}>{imageStats.withImages}</p>
          <p className="text-sm text-muted-foreground">Articles With Images</p>
        </div>
      </div>
      {imageStats.missingFeatured > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">Missing featured images</span>
          </div>
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{imageStats.missingFeatured} articles</Badge>
        </div>
      )}
      {imageStats.noImagesInContent > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-800">Content without any image markup</span>
          </div>
          <Badge variant="secondary" className="bg-red-100 text-red-800">{imageStats.noImagesInContent} articles</Badge>
        </div>
      )}
      {imageStats.missingFeatured === 0 && imageStats.noImagesInContent === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">All scanned articles have featured images and content images. Good job!</p>
      )}
    </div>
  )
}
