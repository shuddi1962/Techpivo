"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, RefreshCw, TrendingUp, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react"

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

export default function AdminKeywordsPage() {
  const [articles, setArticles] = useState<KeywordArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [writing, setWriting] = useState(false)
  const [stats, setStats] = useState({ total: 0, draft: 0, published: 0 })

  const fetchData = async () => {
    const supabase = createClient()

    const [allRes, draftRes, pubRes] = await Promise.all([
      supabase
        .from("keyword_articles")
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
  }

  useEffect(() => { fetchData() }, [])

  const writeArticles = async () => {
    setWriting(true)
    try {
      const res = await fetch("/api/cron/write-keyword-article", {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ""}` },
      })
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
        <Button onClick={writeArticles} disabled={writing || stats.draft === 0}>
          {writing ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Writing...</>
          ) : (
            <><RefreshCw className="h-4 w-4 mr-2" /> Write Pending ({stats.draft})</>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Search className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Keywords</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{stats.draft}</p>
              <p className="text-xs text-muted-foreground">Pending Write</p>
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
              <p className="text-xs text-muted-foreground">Total Search Volume</p>
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
            <p className="text-sm mt-1">Keywords will be fetched daily at 03:45 UTC</p>
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
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
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
                    <a
                      href={`/${a.slug}`}
                      target="_blank"
                      className="text-xs text-primary hover:underline"
                    >
                      View
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
