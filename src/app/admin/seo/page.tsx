"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertTriangle, CheckCircle, TrendingUp, TrendingDown,
  FileText, Link, Image, BarChart3, RefreshCw,
  Globe, Shield, Target, Copy, Trash2, Plus, Eye,
  Loader2, ChevronDown, Wand2
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
        const authority = avgQ && avgSeo ? Math.round((avgSeo + avgQ) / 2)
          : avgQ ? avgQ
          : avgSeo ? avgSeo
          : Math.min(55 + g.count * 2, 95)
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
    const tables = ["seo_audits", "seo_issues", "keyword_rankings", "topic_authority", "seo_redirects", "posts"]
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

  const [auditProgress, setAuditProgress] = useState<{ done: number; total: number } | null>(null)
  const [fixing, setFixing] = useState<string | null>(null)

  const runFix = async (payload: any, label?: string) => {
    setFixing(label || "fixing")
    try {
      const res = await fetch("/api/admin/seo/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) setAuditMsg(`Fix failed: ${data.error || res.status}`)
      else if (payload.action === "fix_all") setAuditMsg(`Auto-fixed ${data.fixed} of ${data.total} articles`)
      else setAuditMsg(`Fix applied`)
      await loadData()
    } catch (e) {
      setAuditMsg(`Fix failed: ${String(e)}`)
    }
    setFixing(null)
  }

  const runSeoAudit = async (target: string) => {
    if (auditing) return
    setAuditing(true)
    setAuditMsg("")
    setAuditProgress(null)
    try {
      let ids: string[] = []
      if (target === "all") {
        ids = postsList.map(p => p.id)
        if (ids.length === 0) {
          const { data } = await supabase.from("posts").select("id").eq("status", "published").limit(300)
          ids = (data || []).map((p: any) => p.id)
        }
      } else {
        ids = [target]
      }

      const total = ids.length
      let done = 0
      for (let i = 0; i < ids.length; i += 25) {
        const chunk = ids.slice(i, i + 25)
        const res = await fetch("/api/admin/seo/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postIds: chunk })
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || `HTTP ${res.status}`)
        }
        done += chunk.length
        setAuditProgress({ done, total })
      }
      setAuditMsg(`Audit complete — ${total} posts checked`)
      await loadData()
    } catch (e) {
      setAuditMsg(`Audit failed: ${String(e)}`)
    }
    setAuditing(false)
    setAuditProgress(null)
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
            {auditing
              ? (auditProgress ? `Auditing ${auditProgress.done}/${auditProgress.total}...` : "Auditing...")
              : "Run Full Audit"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="audit">SEO Audit</TabsTrigger>
          <TabsTrigger value="keywords">Keyword Tracking</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="technical">Technical SEO</TabsTrigger>
          <TabsTrigger value="authority">Topic Authority</TabsTrigger>
          <TabsTrigger value="redirects">Redirects</TabsTrigger>
          <TabsTrigger value="content-decay">Content Decay</TabsTrigger>
          <TabsTrigger value="robots">Robots.txt</TabsTrigger>
          <TabsTrigger value="image-seo">Image SEO</TabsTrigger>
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
                    <p className="text-xs text-muted-foreground">of {postsList.length} published</p>
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
                      <div className="flex items-center gap-2 shrink-0">
                        <Button size="sm" onClick={() => runFix({ action: "fix_issue", postId: issue.post_id, issueType: issue.issue_type, issueId: issue.id })} disabled={fixing !== null}>
                          {fixing !== null ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
                          Fix
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => resolveIssue(issue.id)}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </div>
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
                    {auditing
                      ? (auditProgress ? `Auditing ${auditProgress.done}/${auditProgress.total}...` : "Auditing...")
                      : "Run First Audit"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {audits.map((audit) => (
                    <div key={audit.id} className="border rounded-lg p-4">
                      <p className="text-sm font-medium mb-3">
                        {postsList.find(p => p.id === audit.post_id)?.title || "Post removed"}
                      </p>
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
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => runSeoAudit(audit.post_id)} disabled={auditing}>
                            {auditing && auditProgress === null ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                            Re-audit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setExpandedAudit(expandedAudit === audit.id ? null : audit.id)}>
                            {expandedAudit === audit.id ? <ChevronUpIcon className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                            {expandedAudit === audit.id ? "Hide Details" : "View Details"}
                          </Button>
                        </div>
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
                                      <span className="font-medium">{iss.issue_type || iss.type}</span>
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
                <div className="space-y-4">
                  {(() => {
                    const byType: Record<string, number> = {}
                    issues.forEach(i => { byType[i.issue_type] = (byType[i.issue_type] || 0) + 1 })
                    const fixable = ["missing_meta", "missing_keywords", "missing_featured_image", "no_content_images"]
                    return Object.entries(byType).filter(([t]) => fixable.includes(t)).map(([type, n]) => (
                      <div key={type} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{type.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-muted-foreground">{n} open issue{n > 1 ? 's' : ''} — one-click auto-fix</p>
                        </div>
                        <Button size="sm" onClick={() => runFix({ action: "fix_all", issueType: type }, `fixall_${type}`)} disabled={fixing !== null}>
                          {fixing === `fixall_${type}` ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                          Fix All ({n})
                        </Button>
                      </div>
                    ))
                  })()}
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
                        <div className="flex items-center gap-2 shrink-0">
                          {["missing_meta", "missing_keywords", "missing_featured_image", "no_content_images"].includes(issue.issue_type) && (
                            <Button size="sm" onClick={() => runFix({ action: "fix_issue", postId: issue.post_id, issueType: issue.issue_type, issueId: issue.id }, `fix_${issue.id}`)} disabled={fixing !== null}>
                              {fixing === `fix_${issue.id}` ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
                              Fix
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => resolveIssue(issue.id)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Resolve
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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

        <TabsContent value="redirects" className="space-y-6">
          <RedirectsTab />
        </TabsContent>

        <TabsContent value="content-decay" className="space-y-6">
          <ContentDecayTab />
        </TabsContent>

        <TabsContent value="robots" className="space-y-6">
          <RobotsTab />
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
  const [fixingType, setFixingType] = useState<string | null>(null)
  const [issueCounts, setIssueCounts] = useState<Record<string, number>>({})
  const [fixMsg, setFixMsg] = useState("")
  const [techStats, setTechStats] = useState({
    totalPosts: 0,
    indexedPosts: 0,
    totalRedirects: 0,
    pendingIssues: 0,
    auditsPerformed: 0,
    avgTechnicalScore: 0,
  })

  const fetchData = async () => {
    try {
      const [postsRes, indexedRes, redirectsRes, issuesRes, auditsRes] = await Promise.all([
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published").eq("google_indexed", true),
        supabase.from("seo_redirects").select("*", { count: "exact", head: true }),
        supabase.from("seo_issues").select("issue_type, resolved").eq("resolved", false).limit(300),
        supabase.from("seo_audits").select("technical_health_score").limit(100),
      ])

      const audits = auditsRes.data || []
      const avgTech = audits.length > 0
        ? Math.round(audits.reduce((s, a) => s + (a.technical_health_score || 0), 0) / audits.length)
        : 0

      const counts: Record<string, number> = {}
      ;(issuesRes.data || []).forEach((i: any) => { counts[i.issue_type] = (counts[i.issue_type] || 0) + 1 })

      setIssueCounts(counts)
      setTechStats({
        totalPosts: postsRes.count || 0,
        indexedPosts: indexedRes.count || 0,
        totalRedirects: redirectsRes.count || 0,
        pendingIssues: issuesRes.data?.length || 0,
        auditsPerformed: audits.length,
        avgTechnicalScore: avgTech,
      })
    } catch (err) { console.error("Failed to fetch technical SEO data:", err) }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel(`seo_technical_rt_${realtimeSeq++}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "seo_issues" }, () => fetchData())
      .subscribe()
    const poll = setInterval(fetchData, 60000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [supabase])

  const runFixAll = async (issueType: string) => {
    setFixingType(issueType)
    setFixMsg("")
    try {
      const res = await fetch("/api/admin/seo/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fix_all", issueType })
      })
      const data = await res.json().catch(() => ({}))
      setFixMsg(res.ok ? `Auto-fixed ${data.fixed} of ${data.total} articles` : `Failed: ${data.error || res.status}`)
      await fetchData()
    } catch (e) {
      setFixMsg(`Failed: ${String(e)}`)
    }
    setFixingType(null)
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  const fixableTypes = [
    { key: "missing_meta", label: "Missing meta descriptions" },
    { key: "missing_keywords", label: "No SEO keywords" },
    { key: "missing_featured_image", label: "Missing featured images" },
    { key: "no_content_images", label: "No images in content" },
  ]

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

      <Card>
        <CardHeader>
          <CardTitle>One-Click Quick Fixes</CardTitle>
          <p className="text-sm text-muted-foreground">Auto-generate meta descriptions, keywords, and images from the Media Library. Fixes apply instantly and reflect across the SEO Center in realtime.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {fixMsg && <p className="text-sm font-medium text-green-700">{fixMsg}</p>}
          {fixableTypes.map((f) => (
            <div key={f.key} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-muted/30 border border-border">
              <div>
                <p className="font-medium text-sm">{f.label}</p>
                <p className="text-xs text-muted-foreground">{issueCounts[f.key] || 0} open issues</p>
              </div>
              <Button size="sm" onClick={() => runFixAll(f.key)} disabled={fixingType !== null || !(issueCounts[f.key] > 0)}>
                {fixingType === f.key ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                {fixingType === f.key ? "Fixing..." : `Fix All (${issueCounts[f.key] || 0})`}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
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

function ImageSeoTab() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [fixingPost, setFixingPost] = useState<string | null>(null)
  const [fixAllMsg, setFixAllMsg] = useState("")
  const [imageStats, setImageStats] = useState({
    total: 0,
    missingFeatured: 0,
    noImagesInContent: 0,
    withImages: 0,
  })
  const [missingImagePosts, setMissingImagePosts] = useState<{ id: string; title: string }[]>([])

  const fetchImages = async () => {
    try {
      const { data } = await supabase.from("posts").select("id, title, featured_image, content")
        .eq("status", "published").limit(300)

      const posts = data || []
      let missingFeatured = 0
      let noImagesInContent = 0
      const missing: { id: string; title: string }[] = []

      posts.forEach((p) => {
        if (!p.featured_image) missingFeatured++
        const content = p.content || ""
        const imgTagCount = (content.match(/<img[^>]+>/gi) || []).length
        const mdImgCount = (content.match(/!\[.*?\]\(.*?\)/g) || []).length
        if (imgTagCount === 0 && mdImgCount === 0) {
          noImagesInContent++
          if (missing.length < 10) missing.push({ id: p.id, title: p.title })
        }
      })

      setMissingImagePosts(missing)
      setImageStats({
        total: posts.length,
        missingFeatured,
        noImagesInContent,
        withImages: posts.length - noImagesInContent,
      })
    } catch (err) { console.error("Failed to fetch image SEO data:", err) }
    setLoading(false)
  }

  useEffect(() => {
    fetchImages()
  }, [supabase])

  const addImages = async (postId: string) => {
    setFixingPost(postId)
    try {
      const res = await fetch("/api/admin/seo/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fix_issue", postId, issueType: "no_content_images" })
      })
      const data = await res.json().catch(() => ({}))
      setFixAllMsg(res.ok ? "Images added" : `Failed: ${data.error || res.status}`)
      await fetchImages()
    } catch (e) {
      setFixAllMsg(`Failed: ${String(e)}`)
    }
    setFixingPost(null)
  }

  const addAllImages = async () => {
    setFixAllMsg("")
    try {
      const res = await fetch("/api/admin/seo/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fix_all", issueType: "no_content_images", count: 1 })
      })
      const data = await res.json().catch(() => ({}))
      setFixAllMsg(res.ok ? `Auto-fixed ${data.fixed} of ${data.total} articles` : `Failed: ${data.error || res.status}`)
      await fetchImages()
    } catch (e) {
      setFixAllMsg(`Failed: ${String(e)}`)
    }
  }

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
        <>
          <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Content without any image markup</span>
            </div>
            <Badge variant="secondary" className="bg-red-100 text-red-800">{imageStats.noImagesInContent} articles</Badge>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Articles to Fix</CardTitle>
              <p className="text-sm text-muted-foreground">
                Auto-add a relevant image from the Media Library (or same-category articles), or open the editor to choose manually.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {fixAllMsg && <span className="text-sm font-medium text-green-700">{fixAllMsg}</span>}
                <Button size="sm" onClick={addAllImages} disabled={imageStats.noImagesInContent === 0}>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Auto-Fix All ({imageStats.noImagesInContent})
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {missingImagePosts.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-muted/30">
                  <p className="font-medium text-sm truncate flex-1 min-w-0">{p.title}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => addImages(p.id)} disabled={fixingPost !== null}>
                      {fixingPost === p.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
                      Auto-Add Image
                    </Button>
                    <a href={`/admin/posts/${p.id}/edit`} className="text-sm text-blue-600 hover:underline">
                      Edit →
                    </a>
                  </div>
                </div>
              ))}
              {imageStats.noImagesInContent > 10 && (
                <p className="text-xs text-muted-foreground">
                  Showing 10 of {imageStats.noImagesInContent} articles needing images.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
      {imageStats.missingFeatured === 0 && imageStats.noImagesInContent === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">All scanned articles have featured images and content images. Good job!</p>
      )}
    </div>
  )
}
