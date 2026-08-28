"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Search, RefreshCw, TrendingUp, TrendingDown, CheckCircle,
  Loader2, Sparkles, ExternalLink, X, MessageSquare,
  Filter, Globe, Layers, Eye, BarChart3, Target, Swords,
  Lightbulb, Send, FileText, Wand2, Compass, ArrowRight, Zap, AlertCircle
} from "lucide-react"
import Link from "next/link"

interface KeywordArticle {
  id: string
  keyword: string
  title: string | null
  slug: string | null
  status: string
  source: string
  search_volume: number
  trend_direction: string | null
  cluster: string | null
  category: { name: string; slug: string } | null
  created_at: string
  published_at: string | null
  views: number
}

const SOURCE_LABELS: Record<string, string> = {
  google_trends: "Google Trends", google_autocomplete: "Autocomplete",
  gsc: "GSC", reddit: "Reddit", manual: "Manual",
}

export default function AdminKeywordsPage() {
  const [articles, setArticles] = useState<KeywordArticle[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [stats, setStats] = useState({ total: 0, draft: 0, published: 0, volume: 0 })

  const [searchInput, setSearchInput] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [researching, setResearching] = useState(false)
  const [researchResult, setResearchResult] = useState<{ success: boolean; headline?: string; url?: string; error?: string } | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [clusterFilter, setClusterFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("created_at")
  const [generationMsg, setGenerationMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null)

  const [tab, setTab] = useState<"keywords" | "insights" | "assistant">("keywords")

  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const [allRes, draftRes, pubRes, totalRes] = await Promise.all([
      supabase.from("keyword_articles")
        .select("*, category:categories(name, slug)")
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase.from("keyword_articles").select("*", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("keyword_articles").select("*", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("keyword_articles").select("*", { count: "exact", head: true }),
    ])
    if (allRes.data) setArticles(allRes.data as unknown as KeywordArticle[])
    setStats({
      total: totalRes.count || allRes.data?.length || 0,
      draft: draftRes.count || 0,
      published: pubRes.count || 0,
      volume: (allRes.data || []).reduce((s: number, a: any) => s + (a.search_volume || 0), 0),
    })
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const supabase = createClient()
    supabase.from("categories").select("id, name, slug").order("name").then(({ data }) => {
      if (data) setCategories(data)
    })
  }, [])

  // Realtime: new research, published generations and (future) deletes appear
  // live. Unique channel per mount + removeChannel cleanup (supabase-js
  // returns the SAME channel object for the same name).
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`admin_keywords_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "keyword_articles" },
        () => fetchData()
      )
      .subscribe()

    const interval = setInterval(fetchData, 30000)
    const onFocus = () => fetchData()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const fetchSuggestions = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/google-autocomplete?q=${encodeURIComponent(query)}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.suggestions?.length) { setSuggestions(data.suggestions); setShowSuggestions(true) }
      } catch (err) { console.error("Failed to fetch suggestions:", err) }
    }, 300)
  }, [])

  const doResearch = async () => {
    const kw = searchInput.trim()
    if (!kw || kw.length < 3) return
    setResearching(true); setResearchResult(null)
    try {
      const res = await fetch("/api/admin/research-keyword", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: kw }),
      })
      const data = await res.json()
      setResearchResult(data)
      if (data.success) fetchData()
    } catch (err: any) {
      setResearchResult({ success: false, error: err.message })
    }
    setResearching(false)
  }

  const generateArticle = async (id: string) => {
    setGeneratingId(id); setGenerationMsg(null)
    try {
      const res = await fetch("/api/admin/keywords/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      setGenerationMsg({ id, text: data.success ? "Article published!" : data.error || "Failed", ok: data.success })
      if (data.success) fetchData()
    } catch (err: any) {
      setGenerationMsg({ id, text: err.message, ok: false })
    }
    setGeneratingId(null)
    setTimeout(() => setGenerationMsg(null), 5000)
  }

  const writeAllDrafts = async () => {
    setGeneratingAll(true)
    try {
      const res = await fetch("/api/admin/trigger-keyword-write")
      fetchData()
    } catch (err) { console.error("Failed to write all drafts:", err) }
    setGeneratingAll(false)
  }

  const clusters = Array.from(new Set(articles.map(a => a.cluster).filter(Boolean))) as string[]
  const sources = Array.from(new Set(articles.map(a => a.source).filter(Boolean))) as string[]

  const filtered = articles.filter(a => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false
    if (sourceFilter !== "all" && a.source !== sourceFilter) return false
    if (clusterFilter !== "all" && a.cluster !== clusterFilter) return false
    if (searchInput.trim()) {
      const q = searchInput.toLowerCase()
      if (!(a.keyword?.toLowerCase().includes(q) || a.title?.toLowerCase().includes(q) || a.cluster?.toLowerCase().includes(q))) return false
    }
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "volume") return (b.search_volume || 0) - (a.search_volume || 0)
    if (sortBy === "views") return (b.views || 0) - (a.views || 0)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Keyword Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {stats.draft} drafts awaiting article generation
          </p>
        </div>
        <div className="flex gap-2">
          {tab === "keywords" && (
            <Button onClick={writeAllDrafts} disabled={generatingAll || stats.draft === 0} variant="outline" className="flex-1 sm:flex-none">
              {generatingAll ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Writing...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" /> Write All Drafts ({stats.draft})</>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-border mb-6 overflow-x-auto">
        <button
          onClick={() => setTab("keywords")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            tab === "keywords" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" /> Keywords
        </button>
        <button
          onClick={() => setTab("insights")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            tab === "insights" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 className="h-4 w-4" /> SEO Insights
        </button>
        <button
          onClick={() => setTab("assistant")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            tab === "assistant" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="h-4 w-4" /> AI Assistant
        </button>
      </div>

      {tab === "keywords" && (
        <KeywordsTab
          articles={sorted}
          stats={stats}
          loading={loading}
          researchResult={researchResult}
          researching={researching}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          suggestions={suggestions}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          fetchSuggestions={fetchSuggestions}
          doResearch={doResearch}
          sources={sources}
          clusters={clusters}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          sourceFilter={sourceFilter}
          setSourceFilter={setSourceFilter}
          clusterFilter={clusterFilter}
          setClusterFilter={setClusterFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          generatingId={generatingId}
          generationMsg={generationMsg}
          generateArticle={generateArticle}
          searchRef={searchRef}
        />
      )}

      {tab === "insights" && <SEOInsightsTab articles={articles} categories={categories} />}

      {tab === "assistant" && <AIAssistantTab articles={articles} categories={categories} stats={stats} />}
    </div>
  )
}

type KeywordsTabProps = {
  articles: KeywordArticle[]
  stats: { total: number; draft: number; published: number; volume: number }
  loading: boolean
  researchResult: { success: boolean; headline?: string; url?: string; error?: string } | null
  researching: boolean
  searchInput: string
  setSearchInput: (v: string) => void
  suggestions: string[]
  showSuggestions: boolean
  setShowSuggestions: (v: boolean) => void
  fetchSuggestions: (q: string) => void
  doResearch: () => void
  sources: string[]
  clusters: string[]
  statusFilter: string
  setStatusFilter: (v: string) => void
  sourceFilter: string
  setSourceFilter: (v: string) => void
  clusterFilter: string
  setClusterFilter: (v: string) => void
  sortBy: string
  setSortBy: (v: string) => void
  generatingId: string | null
  generationMsg: { id: string; text: string; ok: boolean } | null
  generateArticle: (id: string) => void
  searchRef: React.RefObject<HTMLDivElement>
}

function KeywordsTab({ articles, stats, loading, researchResult, researching, searchInput, setSearchInput, suggestions, showSuggestions, setShowSuggestions, fetchSuggestions, doResearch, sources, clusters, statusFilter, setStatusFilter, sourceFilter, setSourceFilter, clusterFilter, setClusterFilter, sortBy, setSortBy, generatingId, generationMsg, generateArticle, searchRef }: KeywordsTabProps) {
  return (
    <div>
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="relative" ref={searchRef}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text" value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); fetchSuggestions(e.target.value) }}
                  onKeyDown={(e) => { if (e.key === "Enter") { setShowSuggestions(false); doResearch() } }}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Search keywords or add a new topic to research with AI..."
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <Button onClick={doResearch} disabled={researching || searchInput.trim().length < 3}>
                {researching ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Researching...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Research & Write</>
                )}
              </Button>
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => { setSearchInput(s); setShowSuggestions(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2 transition-colors">
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          {researching && (
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">AI researching &quot;{searchInput.trim()}&quot; with web search...</span>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Writing article, generating SEO metadata, answer capsule, key points, FAQ, sourcing images</p>
            </div>
          )}
          {researchResult && !researching && (
            <div className={`mt-4 p-4 rounded-lg border ${researchResult.success ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"}`}>
              {researchResult.success ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-green-700 dark:text-green-300">Published: {researchResult.headline}</span>
                  </div>
                  {researchResult.url && (
                    <Link href={researchResult.url} target="_blank" className="flex items-center gap-1 text-sm text-primary hover:underline">
                      View <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <X className="h-5 w-5" />
                  <span className="text-sm">{researchResult.error}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500 shrink-0" />
            <div><p className="text-2xl font-bold">{stats.published}</p><p className="text-xs text-muted-foreground">Published</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-purple-500 shrink-0" />
            <div><p className="text-2xl font-bold">{stats.volume.toLocaleString()}</p><p className="text-xs text-muted-foreground">Search Vol.</p></div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">All Sources</option>
              {sources.map(s => <option key={s} value={s}>{SOURCE_LABELS[s] || s}</option>)}
            </select>
            {clusters.length > 0 && (
              <select value={clusterFilter} onChange={(e) => setClusterFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="all">All Clusters</option>
                {clusters.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <div className="h-6 w-px bg-border" />
            <span className="text-xs text-muted-foreground">Sort:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="created_at">Newest</option>
              <option value="volume">Search Volume</option>
              <option value="views">Views</option>
            </select>
            <span className="text-xs text-muted-foreground ml-auto">{articles.length} of {stats.total}</span>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : articles.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No keywords found</p>
            <p className="text-sm mt-1">Search a topic above to research, or wait for the daily keyword fetch at 03:45 UTC</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {articles.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate max-w-md">{a.title || a.keyword}</p>
                      {a.status === "published" ? (
                        <Badge variant="default" className="bg-green-500 shrink-0">Published</Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0">Draft</Badge>
                      )}
                      {a.cluster && (
                        <Badge variant="outline" className="text-xs shrink-0 flex items-center gap-1">
                          <Layers className="h-3 w-3" /> {a.cluster}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <Badge variant="outline" className="text-xs">{SOURCE_LABELS[a.source] || a.source}</Badge>
                      {a.category && <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {a.category.name}</span>}
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <TrendingUp className="h-3 w-3 text-purple-500" />
                        {a.search_volume > 0 ? a.search_volume.toLocaleString() : "—"}
                        {a.trend_direction === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
                        {a.trend_direction === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
                      </span>
                      {a.views > 0 && <span className="flex items-center gap-1"><Eye className="h-3 w-3 text-blue-500" /> {a.views}</span>}
                      <span>{new Date(a.created_at).toLocaleDateString()}</span>
                      {a.published_at && <span>Published: {new Date(a.published_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 mt-1">
                    {a.status === "draft" && (
                      <>
                        <Button size="sm" onClick={() => generateArticle(a.id)} disabled={generatingId === a.id}>
                          {generatingId === a.id ? (
                            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Writing</>
                          ) : (
                            <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate</>
                          )}
                        </Button>
                        {generationMsg && generationMsg.id === a.id && (
                          <span className={`text-xs ${generationMsg.ok ? "text-green-500" : "text-red-500"}`}>{generationMsg.text}</span>
                        )}
                      </>
                    )}
                    {a.slug && (
                      <a href={`/${a.slug}`} target="_blank" className="text-xs text-primary hover:underline flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> View
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

type InsightTab = "volume" | "ideas" | "intent" | "serp" | "trends" | "domain"

type SEOInsightsTabProps = {
  articles: KeywordArticle[]
  categories: { id: string; name: string; slug: string }[]
}

function SEOInsightsTab({ articles, categories }: SEOInsightsTabProps) {
  const [subTab, setSubTab] = useState<InsightTab>("volume")
  const [seed, setSeed] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [trends, setTrends] = useState<any[]>([])
  const [intents, setIntents] = useState<any[]>([])
  const [serp, setSerp] = useState<any[]>([])
  const [domain, setDomain] = useState("techpivo.com")
  const [domainResults, setDomainResults] = useState<any>(null)
  const [locationCode, setLocationCode] = useState(2840) // default: United States
  const [languageCode, setLanguageCode] = useState("en")

  const isContent = (kw: string) => {
    const l = kw.toLowerCase()
    if (/\b(review|reviews|unboxing|unbox|vs|comparison|compared|alternative|alternatives)\b/.test(l)) return "review"
    if (/\b(how to|tutorial|guide|step by step|step-by-step|setup|set up|install|configure|learn)\b/.test(l)) return "tutorial"
    if (/\b(what is|what are|meaning|definition|explained|difference|why)\b/.test(l)) return "explainer"
    if (/\b(ai|automation|machine learning|llm|gpt|gemini|claude)\b/.test(l)) return "ai"
    if (/\b(security|vpn|antivirus|malware|phishing|breach|leak|cybersecurity|2fa|password)\b/.test(l)) return "security"
    if (/\b(laptop|phone|gadget|smartphone|monitor|keyboard|mouse|headset|headphone|tablet|watch)\b/.test(l)) return "gadgets"
    if (/\b(react|next\.?js|javascript|typescript|python|sql|node|css|html|api|github|vscode|framework)\b/.test(l)) return "programming"
    if (/\b(best|top|cheap|affordable|under)\b/.test(l)) return "buying"
    return "general"
  }

  const callDFS = async (action: string, extra: any = {}) => {
    if (!seed.trim() || seed.trim().length < 2) { setError("Enter a seed keyword first"); return null }
    setLoading(true); setError(null)
    try {
      const r = await fetch("/api/admin/seo-dataforseo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, keyword: seed.trim(), location_code: locationCode, language_code: languageCode, ...extra }),
      })
      const data = await r.json()
      if (!r.ok || data?.error) { setError(data?.error || data?.raw?.status_message || `HTTP ${r.status}`); return null }
      return data
    } catch (e: any) { setError(e?.message || "Network error"); return null }
    finally { setLoading(false) }
  }

  const runSearchVolume = async () => {
    const data = await callDFS("search_volume", { keywords: seed.split(",").map(s => s.trim()).filter(Boolean).slice(0, 100) })
    if (data?.items) setItems(data.items)
  }
  const runIdeas = async () => {
    const data = await callDFS("keywords_for_keyword")
    if (data?.items) setItems(data.items)
  }
  const runRelated = async () => {
    const data = await callDFS("related_keywords")
    if (data?.items) setItems(data.items)
  }
  const runIntent = async () => {
    const data = await callDFS("search_intent")
    if (data?.items) setIntents(data.items)
  }
  const runSerp = async () => {
    const data = await callDFS("serp_competitors")
    if (data?.items) setSerp(data.items)
  }
  const runTrends = async () => {
    const data = await callDFS("trends_explore")
    if (data?.items) setTrends(data.items)
  }
  const runDomainKeywords = async () => {
    if (!domain.trim()) { setError("Enter a domain"); return }
    setLoading(true); setError(null)
    try {
      const r = await fetch("/api/admin/seo-dataforseo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "domain_keywords", domain: domain.trim(), location_code: locationCode, language_code: languageCode }),
      })
      const data = await r.json()
      if (!r.ok || data?.error) setError(data?.error || `HTTP ${r.status}`)
      else setDomainResults(data)
    } catch (e: any) { setError(e?.message || "Network error") }
    finally { setLoading(false) }
  }

  const onImportKeyword = (kw: string) => {
    setSeed(kw)
    setSubTab("ideas")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <SubTabButton active={subTab === "volume"} onClick={() => setSubTab("volume")} icon={<BarChart3 className="h-3.5 w-3.5" />}>Search Volume</SubTabButton>
            <SubTabButton active={subTab === "ideas"} onClick={() => setSubTab("ideas")} icon={<Lightbulb className="h-3.5 w-3.5" />}>Keyword Ideas</SubTabButton>
            <SubTabButton active={subTab === "intent"} onClick={() => setSubTab("intent")} icon={<Target className="h-3.5 w-3.5" />}>Search Intent</SubTabButton>
            <SubTabButton active={subTab === "serp"} onClick={() => setSubTab("serp")} icon={<Swords className="h-3.5 w-3.5" />}>SERP Competitors</SubTabButton>
            <SubTabButton active={subTab === "trends"} onClick={() => setSubTab("trends")} icon={<TrendingUp className="h-3.5 w-3.5" />}>Google Trends</SubTabButton>
            <SubTabButton active={subTab === "domain"} onClick={() => setSubTab("domain")} icon={<Compass className="h-3.5 w-3.5" />}>Domain Keywords</SubTabButton>
          </div>

          {subTab === "domain" ? (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text" value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="Enter domain (e.g. techpivo.com)"
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <Button onClick={runDomainKeywords} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
                Analyze
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text" value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") {
                    if (subTab === "volume") runSearchVolume()
                    else if (subTab === "ideas") runIdeas()
                    else if (subTab === "intent") runIntent()
                    else if (subTab === "serp") runSerp()
                    else if (subTab === "trends") runTrends()
                  } }}
                  placeholder={subTab === "trends" ? "topic to trend-explore (e.g. 'ai tools')" : "seed keyword (e.g. 'react hooks')"}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <Button onClick={() => {
                if (subTab === "volume") runSearchVolume()
                else if (subTab === "ideas") runIdeas()
                else if (subTab === "intent") runIntent()
                else if (subTab === "serp") runSerp()
                else if (subTab === "trends") runTrends()
              }} disabled={loading || seed.trim().length < 2}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
                Run
              </Button>
            </div>
          )}

            {error && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          {!error && loading === false && (subTab !== "domain" && items.length === 0 && intents.length === 0 && serp.length === 0 && trends.length === 0 && !domainResults) && (
            <p className="text-xs text-muted-foreground mt-3">Enter a seed keyword and run. Configure DataForSEO in <Link href="/admin/settings" className="text-primary hover:underline">Settings → SEO Intelligence</Link> if you see a not-configured error.</p>
          )}
          {subTab !== "domain" && (
            <div className="flex gap-3 mt-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <select
                  value={locationCode}
                  onChange={(e) => setLocationCode(Number(e.target.value))}
                  className="h-9 pl-2 pr-6 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
                >
                  <option value={2840}>United States</option>
                  <option value={2826}>United Kingdom</option>
                  <option value={2158}>India</option>
                  <option value={2768}>Canada</option>
                  <option value={2763}>Australia</option>
                  <option value={2765}>Germany</option>
                  <option value={2766}>France</option>
                  <option value={2717}>Brazil</option>
                  <option value={2824}>UAE</option>
                  <option value={2762}>Nigeria</option>
                  <option value={2827}>Kenya</option>
                  <option value={2724}>South Africa</option>
                  <option value={2828}>Global (Worldwide)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={languageCode}
                  onChange={(e) => setLanguageCode(e.target.value)}
                  className="h-9 pl-2 pr-6 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="pt">Portuguese</option>
                  <option value="hi">Hindi</option>
                  <option value="zh">Chinese</option>
                  <option value="ja">Japanese</option>
                  <option value="ar">Arabic</option>
                  <option value="sw">Swahili</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {subTab === "volume" && items.length > 0 && (
        <ResultList title="Search Volume">
          {items.map((it: any, i: number) => (
            <ResultRow
              key={i}
              keyword={it.keyword}
              volume={it.search_volume}
              cpc={it.cpc}
              competition={it.competition}
              badge={isContent(it.keyword)}
              onAdd={() => onImportKeyword(it.keyword)}
            />
          ))}
        </ResultList>
      )}

      {subTab === "ideas" && items.length > 0 && (
        <ResultList title="Keyword Ideas">
          {items.map((it: any, i: number) => (
            <ResultRow
              key={i}
              keyword={it.keyword}
              volume={it.search_volume}
              badge={isContent(it.keyword)}
              onAdd={() => onImportKeyword(it.keyword)}
            />
          ))}
        </ResultList>
      )}

      {subTab === "intent" && intents.length > 0 && (
        <ResultList title="Search Intent">
          {intents.map((it: any, i: number) => (
            <ResultRow
              key={i}
              keyword={it.keyword}
              volume={it.search_volume}
              intent={it.search_intent}
              badge={isContent(it.keyword)}
              onAdd={() => onImportKeyword(it.keyword)}
            />
          ))}
        </ResultList>
      )}

      {subTab === "serp" && serp.length > 0 && (
        <ResultList title="Top SERP Competitors">
          {serp.map((it: any, i: number) => (
            <Card key={i} className="bg-muted/30">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <a href={it.url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline flex items-center gap-1.5">
                    {it.domain || new URL(it.url || "https://x").hostname} <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{it.title}</p>
                </div>
                {it.main_domain && <Badge variant="outline" className="text-xs shrink-0">{it.main_domain}</Badge>}
              </CardContent>
            </Card>
          ))}
        </ResultList>
      )}

      {subTab === "trends" && trends.length > 0 && (
        <ResultList title="Trending Now (Google Trends)">
          {trends.map((it: any, i: number) => (
            <ResultRow
              key={i}
              keyword={it.keyword || it.topic_title || JSON.stringify(it)}
              volume={it.search_volume}
              trend={it.trend}
              badge={isContent(it.keyword || it.topic_title)}
              onAdd={() => onImportKeyword(it.keyword || it.topic_title)}
            />
          ))}
        </ResultList>
      )}

      {subTab === "domain" && domainResults && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Compass className="h-4 w-4" /> Keywords {domainResults.domain} ranks for</h3>
            {domainResults.items?.length ? (
              <div className="space-y-2">
                {domainResults.items.slice(0, 50).map((it: any, i: number) => (
                  <ResultRow
                    key={i}
                    keyword={it.keyword}
                    position={it.rank_position || it.position}
                    volume={it.search_volume}
                    badge={isContent(it.keyword)}
                    onAdd={() => onImportKeyword(it.keyword)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No keywords returned. Try a different domain.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SubTabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`h-7 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
      }`}
    >
      {icon} {children}
    </button>
  )
}

function ResultList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-500" /> {title}</h3>
        <div className="space-y-2">{children}</div>
      </CardContent>
    </Card>
  )
}

function ResultRow({ keyword, volume, cpc, competition, intent, position, trend, badge, onAdd }: { keyword: string; volume?: number; cpc?: number; competition?: number; intent?: string; position?: number; trend?: string; badge?: string; onAdd: () => void }) {
  const vol = volume && volume > 0 ? volume : null
  const badgeColor =
    badge === "review" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" :
    badge === "tutorial" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" :
    badge === "explainer" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300" :
    badge === "ai" ? "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300" :
    badge === "security" ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300" :
    badge === "gadgets" ? "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300" :
    badge === "programming" ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300" :
    badge === "buying" ? "bg-pink-100 text-pink-700 dark:bg-pink-950/30 dark:text-pink-300" :
    "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300"
  return (
    <div className="flex items-center justify-between gap-3 p-2.5 rounded-md hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{keyword}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          {vol && <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-purple-500" /> {vol.toLocaleString()}</span>}
          {cpc != null && <span>${cpc.toFixed(2)} CPC</span>}
          {competition != null && <span>Comp {Math.round(competition * 100)}%</span>}
          {intent && <Badge variant="outline" className="text-[10px] py-0">{intent}</Badge>}
          {position != null && <Badge variant="outline" className="text-[10px] py-0">Pos #{position}</Badge>}
          {badge && <span className={`text-[10px] px-1.5 py-0.5 rounded ${badgeColor} font-medium`}>{badge}</span>}
        </div>
      </div>
      <Button size="sm" variant="ghost" onClick={onAdd} className="h-7 text-xs">
        Use <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </div>
  )
}

type AIAssistantTabProps = {
  articles: KeywordArticle[]
  categories: { id: string; name: string; slug: string }[]
  stats: { total: number; draft: number; published: number; volume: number }
}

function AIAssistantTab({ articles, categories, stats }: AIAssistantTabProps) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const QUICK_ACTIONS = [
    { label: "What to write today?", icon: "🎯", prompt: "You are TechPivo's SEO content strategist. Our audience is global — developers, tech enthusiasts, and gadget buyers worldwide. Based on our existing published articles and trending search data, tell us: What 5 topics should we cover today that would drive the most organic traffic? Give specific titles and why they matter." },
    { label: "Content gaps to fill", icon: "🔍", prompt: "You are TechPivo's SEO analyst. We have published articles on these topics: LIST. Compare this against high-search-volume tech keywords trending globally. Tell us exactly which 5 content gaps are costing us the most traffic." },
    { label: "How-to keywords", icon: "📚", prompt: "You are TechPivo's keyword research expert. Find 10 'how to...' and 'what is...' keywords in tech, programming, AI, cybersecurity, and gadgets that developers and tech enthusiasts search for daily worldwide. Include estimated search intent type and article format recommendation." },
    { label: "Review opportunities", icon: "⭐", prompt: "You are TechPivo's product editor. Based on trending tech products and gadgets in 2026, recommend 5 specific products we should review that consumers are actively searching for. Include why each matters to our global audience." },
    { label: "Tutorials needed", icon: "🛠️", prompt: "You are TechPivo's tutorial director. Our global audience includes developers and tech workers at every skill level. Recommend 5 step-by-step tutorial topics they desperately need. Include the audience pain point and why we're uniquely positioned to rank." },
    { label: "AI news angles", icon: "🤖", prompt: "You are TechPivo's AI beat reporter. Gemini, ChatGPT, Claude, open-source LLMs — what's happening right now that we should cover urgently? Give 5 story angles with specific headlines and the official sources we should cite." },
    { label: "Comparison articles", icon: "⚖️", prompt: "You are TechPivo's comparison editor. People search 'X vs Y' constantly. List 5 high-traffic comparison pairs in tech/AI/gadgets that would resonate with a global audience and rank quickly on Google." },
    { label: "Seasonal topics now", icon: "📅", prompt: "What tech topics are people searching for more than usual this season worldwide? Include any upcoming events, product launches, or industry moments relevant to our audience." },
  ]

  const runQuick = async (prompt: string) => {
    setLoading(true)
    setMessages(prev => [...prev, { role: "user" as const, content: prompt }, { role: "assistant" as const, content: "" }])
    try {
      const r = await fetch("/api/admin/seo-dataforseo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ai_chat", question: prompt, context: buildContext() }),
      })
      const data = await r.json()
      const reply = data?.answer || data?.raw?.answer || data?.raw?.status_message || data?.error || "No response received. Configure DataForSEO in Settings → SEO Intelligence."
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: reply } : m))
    } catch (e: any) {
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: `Error: ${e.message}` } : m))
    }
    setLoading(false)
  }

  const runCustom = async () => {
    if (!input.trim()) return
    const q = input.trim()
    setInput("")
    setLoading(true)
    setMessages(prev => [...prev, { role: "user" as const, content: q }, { role: "assistant" as const, content: "" }])
    try {
      const r = await fetch("/api/admin/seo-dataforseo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ai_chat", question: q, context: buildContext() }),
      })
      const data = await r.json()
      const reply = data?.answer || data?.raw?.answer || data?.raw?.status_message || data?.error || "No response. Configure DataForSEO in Settings."
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: reply } : m))
    } catch (e: any) {
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: `Error: ${e.message}` } : m))
    }
    setLoading(false)
  }

  function buildContext() {
    const cats = articles.reduce((acc: Record<string, number>, a) => {
      const c = a.category?.name || "Uncategorized"
      acc[c] = (acc[c] || 0) + 1
      return acc
    }, {})
    const topVol = [...articles].filter(a => a.search_volume > 0).sort((a, b) => b.search_volume - a.search_volume).slice(0, 10)
    return {
      publishedCount: stats.published,
      draftCount: stats.draft,
      totalVolume: stats.volume,
      categories: cats,
      topKeywords: topVol.map(a => ({ keyword: a.keyword, volume: a.search_volume, title: a.title, category: a.category?.name })),
    }
  }

  const runResearch = async (kw: string) => {
    if (!kw) return
    setGenerating(true)
    try {
      const r = await fetch("/api/admin/research-keyword", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: kw }),
      })
      const d = await r.json()
      setResult({ ok: d.success, msg: d.success ? `Research queued: "${kw}"` : d.error || "Failed" })
    } catch (e: any) { setResult({ ok: false, msg: e.message }) }
    setGenerating(false)
    setTimeout(() => setResult(null), 6000)
  }

  const writeAllDrafts = async () => {
    setGenerating(true)
    try {
      const r = await fetch("/api/admin/trigger-keyword-write", { method: "GET" })
      const d = await r.json()
      setResult({ ok: d.ok !== false, msg: d?.message || `Triggered writing of all drafts` })
    } catch (e: any) { setResult({ ok: false, msg: e.message }) }
    setGenerating(false)
    setTimeout(() => setResult(null), 6000)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK_ACTIONS.map((qa) => (
          <button key={qa.label} onClick={() => runQuick(qa.prompt)}
            className="text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm">
            <span className="text-base mr-1.5">{qa.icon}</span>
            <span className="font-medium text-xs">{qa.label}</span>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Ask our SEO strategist</span>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") runCustom() }}
                placeholder="e.g. what topics should we cover this week for our global audience?"
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <Button onClick={runCustom} disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          {result && (
            <div className={`mt-3 text-sm px-3 py-2 rounded-md ${result.ok ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300" : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"}`}>
              {result.msg}
            </div>
          )}
        </CardContent>
      </Card>

      {messages.length > 0 && (
        <Card>
          <CardContent className="p-4 max-h-96 overflow-y-auto space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-amber-500 text-white"}`}>
                  {m.role === "user" ? "U" : "AI"}
                </div>
                <div className={`flex-1 rounded-xl px-4 py-3 text-sm ${m.role === "user" ? "bg-primary/10 dark:bg-primary/20" : "bg-muted"}`}>
                  {i === messages.length - 1 && loading ? (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="text-xs">Thinking</span><Loader2 className="h-3 w-3 animate-spin" />
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </CardContent>
        </Card>
      )}

      {stats.draft > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">{stats.draft} draft articles ready to generate</p>
                  <p className="text-xs text-muted-foreground">Keyword ideas waiting in the pipeline</p>
                </div>
              </div>
              <Button size="sm" className="shrink-0" onClick={() => runResearch("")}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wand2 className="h-4 w-4 mr-1" />}
                Generate All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
