"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Search, RefreshCw, TrendingUp, Clock, CheckCircle,
  Loader2, Sparkles, ExternalLink, X, Zap, Hash
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
  category: { name: string } | null
  created_at: string
  published_at: string | null
  views: number
}

interface SearchResult {
  success: boolean
  slug?: string
  url?: string
  headline?: string
  blizineScore?: number
  suggestedCategory?: string
  seoTitle?: string
  seoDescription?: string
  error?: string
}

export default function AdminKeywordsPage() {
  const [articles, setArticles] = useState<KeywordArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [writing, setWriting] = useState(false)
  const [stats, setStats] = useState({ total: 0, draft: 0, published: 0 })

  const [searchInput, setSearchInput] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [researching, setResearching] = useState(false)
  const [researchResult, setResearchResult] = useState<SearchResult | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const [allRes, draftRes, pubRes] = await Promise.all([
      supabase.from("keyword_articles")
        .select("*, category:categories(name)")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("keyword_articles").select("*", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("keyword_articles").select("*", { count: "exact", head: true }).eq("status", "published"),
    ])
    if (allRes.data) setArticles(allRes.data as unknown as KeywordArticle[])
    setStats({
      total: allRes.data?.length || 0,
      draft: draftRes.count || 0,
      published: pubRes.count || 0,
    })
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
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
        if (data.suggestions?.length) {
          setSuggestions(data.suggestions)
          setShowSuggestions(true)
        }
      } catch {}
    }, 300)
  }, [])

  const handleSearchChange = (val: string) => {
    setSearchInput(val)
    fetchSuggestions(val)
  }

  const pickSuggestion = (s: string) => {
    setSearchInput(s)
    setSuggestions([])
    setShowSuggestions(false)
  }

  const doResearch = async () => {
    const kw = searchInput.trim()
    if (!kw || kw.length < 3) return
    setResearching(true)
    setResearchResult(null)
    try {
      const res = await fetch("/api/admin/research-keyword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setShowSuggestions(false)
      doResearch()
    }
  }

  const writePending = async () => {
    setWriting(true)
    try {
      const res = await fetch("/api/admin/trigger-keyword-write")
      const data = await res.json()
      alert(data.error ? `Error: ${data.error}` : `Written: ${data.written || 0}/${data.processed || 0}`)
      fetchData()
    } catch (err: any) {
      alert("Error: " + err.message)
    }
    setWriting(false)
  }

  const sourceLabel = (s: string) => {
    const labels: Record<string, string> = {
      google_trends: "Google Trends",
      google_autocomplete: "Autocomplete",
      gsc: "GSC",
      reddit: "Reddit",
      manual: "Manual Research",
    }
    return labels[s] || s
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Keyword Articles</h1>
          <p className="text-sm text-muted-foreground mt-1">SEO/GEO/AEO keyword-driven content pipeline</p>
        </div>
        <Button onClick={writePending} disabled={writing || stats.draft === 0} variant="outline">
          {writing ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Writing...</>
          ) : (
            <><RefreshCw className="h-4 w-4 mr-2" /> Write Pending ({stats.draft})</>
          )}
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="relative" ref={searchRef}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Search any topic or keyword to research with Gemini + Google Search..."
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
                  <button
                    key={i}
                    onClick={() => pickSuggestion(s)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2 transition-colors"
                  >
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {researching && (
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Gemini researching &quot;{searchInput}&quot; with Google Search Grounding...</span>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Writing article, generating SEO metadata, answer capsule (AEO), quick brief, key points, FAQ, sourcing images
              </p>
            </div>
          )}

          {researchResult && !researching && (
            <div className={`mt-4 p-4 rounded-lg border ${researchResult.success ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"}`}>
              {researchResult.success ? (
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-green-700 dark:text-green-300">Article Published</span>
                    </div>
                    {researchResult.url && (
                      <Link href={researchResult.url} target="_blank" className="flex items-center gap-1 text-sm text-primary hover:underline">
                        View Article <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-green-600 dark:text-green-400 space-y-1">
                    <p><strong>Headline:</strong> {researchResult.headline}</p>
                    <p><strong>SEO Title:</strong> {researchResult.seoTitle}</p>
                    <p><strong>Description:</strong> {researchResult.seoDescription}</p>
                    <div className="flex gap-3">
                      <Badge variant="outline" className="bg-green-100 dark:bg-green-900/50">
                        Score: {researchResult.blizineScore}/100
                      </Badge>
                      <Badge variant="outline" className="bg-green-100 dark:bg-green-900/50">
                        Category: {researchResult.suggestedCategory}
                      </Badge>
                    </div>
                  </div>
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

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Hash className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{stats.draft}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.published}</p>
              <p className="text-xs text-muted-foreground">Published</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{articles.reduce((s, a) => s + a.search_volume, 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Search Volume</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Zap className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{articles.filter(a => a.source === "manual").length}</p>
              <p className="text-xs text-muted-foreground">Manual Research</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : articles.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No keyword articles yet</p>
            <p className="text-sm mt-1">Search a topic above to research and write one, or wait for the daily fetch at 03:45 UTC</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {articles.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{a.title || a.keyword}</p>
                    {a.status === "published" ? (
                      <Badge variant="default" className="bg-green-500 shrink-0">Published</Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">Draft</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <Badge variant="outline" className="text-xs">{sourceLabel(a.source)}</Badge>
                    {a.category && <span>{a.category.name}</span>}
                    {a.search_volume > 0 && <span>SV: {a.search_volume.toLocaleString()}</span>}
                    {a.views > 0 && <span>{a.views} views</span>}
                    <span>{new Date(a.created_at).toLocaleDateString()}</span>
                    {a.published_at && <span>Published: {new Date(a.published_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.slug && (
                    <a href={`/${a.slug}`} target="_blank" className="text-xs text-primary hover:underline flex items-center gap-1">
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
