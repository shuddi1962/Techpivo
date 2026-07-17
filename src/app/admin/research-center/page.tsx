"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Search, FileText, CheckCircle, XCircle, Clock, Globe,
  ExternalLink, RefreshCw, Sparkles, BookOpen, Link2,
  AlertTriangle, ChevronDown, ChevronUp
} from "lucide-react"

interface ResearchBrief {
  id?: string
  topic: string
  title?: string
  slug?: string
  summary?: string
  meta_description?: string
  outline?: Array<{ heading: string; level: number }>
  sources?: Array<{ title: string; url: string; tier: number }>
  suggested_angle?: string
  suggested_category?: string
  suggested_tags?: string[]
  keyword_cluster?: string[]
  keywords?: string[]
  target_audience?: string
  estimated_reading_time?: string
  content_type?: string
  category?: string
  status?: string
}

export default function ResearchCenterPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [topic, setTopic] = useState("")
  const [category, setCategory] = useState("Technology")
  const [keywords, setKeywords] = useState("")
  const [researching, setResearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [brief, setBrief] = useState<ResearchBrief | null>(null)
  const [savedBriefs, setSavedBriefs] = useState<any[]>([])
  const [expandedBrief, setExpandedBrief] = useState<string | null>(null)

  const fetchSavedBriefs = useCallback(async () => {
    const { data: posts } = await supabase
      .from("posts")
      .select("id, title, slug, status, created_at, tags, seo_keywords")
      .order("created_at", { ascending: false })
      .limit(20)

    if (posts) {
      setSavedBriefs(posts.map(p => ({
        id: p.id,
        topic: p.title,
        status: p.status,
        created_at: p.created_at,
        tags: p.tags || [],
      })))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchSavedBriefs() }, [fetchSavedBriefs])

  const handleResearch = async () => {
    if (!topic.trim()) return
    setResearching(true)
    setError(null)
    setBrief(null)

    try {
      const keywordArray = keywords
        .split(",")
        .map(k => k.trim())
        .filter(Boolean)

      const res = await fetch("/api/admin/editorial-intelligence/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          category,
          keywords: keywordArray.length > 0 ? keywordArray : undefined,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Request failed (${res.status})`)
      }

      const data = await res.json()
      const resultBrief: ResearchBrief = {
        ...data.brief,
        sources: data.brief.sources || [
          { title: "Official Documentation", url: `https://www.google.com/search?q=${encodeURIComponent(topic)}+official`, tier: 1 },
          { title: "Tech News Coverage", url: `https://www.google.com/search?q=${encodeURIComponent(topic)}+news`, tier: 2 },
          { title: "Community Discussion", url: `https://www.google.com/search?q=${encodeURIComponent(topic)}+discussion`, tier: 3 },
        ],
        keyword_cluster: data.brief.keywords || data.brief.keyword_cluster || [topic.toLowerCase(), `${topic.toLowerCase()} guide`, `best ${topic.toLowerCase()}`],
        suggested_category: data.brief.category || data.brief.suggested_category || category,
        suggested_tags: data.brief.suggested_tags || [topic.split(" ")[0] || topic, "Technology", "2026"],
        suggested_angle: data.brief.suggested_angle || `A comprehensive guide to ${topic}, covering what's new, why it matters, and how it impacts developers and tech professionals.`,
        summary: data.brief.meta_description || `Research brief for "${topic}" — This topic covers recent developments and provides opportunities for TechPivo coverage with strong search potential.`,
      }

      setBrief(resultBrief)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed. Please try again.")
    } finally {
      setResearching(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Search className="h-6 w-6 text-blue-500" />
          Research Center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Research topics before writing — enforce Principle 2: Research Before Writing</p>
      </div>

      {/* Research Input */}
      <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          New Research
        </h3>
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a topic to research (e.g., 'GPT-5 release features')"
              className="flex-1 px-4 py-2 border rounded-lg bg-background text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleResearch()}
            />
            <button
              onClick={handleResearch}
              disabled={researching || !topic.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {researching ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Researching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Research
                </>
              )}
            </button>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
              >
                <option value="Technology">Technology</option>
                <option value="AI & Automation">AI & Automation</option>
                <option value="Cybersecurity">Cybersecurity</option>
                <option value="Programming">Programming</option>
                <option value="Web Development">Web Development</option>
                <option value="Gadgets">Gadgets</option>
                <option value="Tech News">Tech News</option>
                <option value="Tutorials">Tutorials</option>
                <option value="Reviews">Reviews</option>
                <option value="Digital Business">Digital Business</option>
                <option value="Networking & IT">Networking & IT</option>
                <option value="Desktops">Desktops</option>
              </select>
            </div>
            <div className="flex-[2]">
              <label className="block text-xs text-muted-foreground mb-1">Keywords (comma-separated, optional)</label>
              <input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. GPT-5, OpenAI, AI models"
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        </div>
      )}

      {/* Research Brief */}
      {brief && (
        <div className="bg-white dark:bg-[#111827] border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-500" />
              Research Brief: {brief.topic}
            </h3>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600">
                <CheckCircle className="h-4 w-4" />
                Approve & Draft
              </button>
              <button
                onClick={() => setBrief(null)}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="text-sm font-semibold mb-2">Summary</h4>
                <p className="text-sm text-muted-foreground">{brief.summary}</p>
              </div>

              {brief.outline && brief.outline.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <h4 className="text-sm font-semibold mb-2">Outline</h4>
                  <ul className="space-y-1">
                    {brief.outline.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">{"\u2022"}</span>
                        <span className={item.level === 1 ? "font-semibold" : ""}>{item.heading}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-4 border rounded-lg">
                <h4 className="text-sm font-semibold mb-2">Suggested Angle</h4>
                <p className="text-sm text-muted-foreground">{brief.suggested_angle}</p>
              </div>

              {brief.sources && (
                <div className="p-4 border rounded-lg">
                  <h4 className="text-sm font-semibold mb-2">Sources ({brief.sources.length})</h4>
                  <div className="space-y-2">
                    {brief.sources.map((source, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          source.tier === 1 ? "bg-green-500/10 text-green-500" :
                          source.tier === 2 ? "bg-blue-500/10 text-blue-500" :
                          "bg-gray-500/10 text-gray-500"
                        }`}>
                          T{source.tier}
                        </span>
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                          {source.title}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {brief.meta_description && (
                <div className="p-4 border rounded-lg">
                  <h4 className="text-sm font-semibold mb-2">Meta Description</h4>
                  <p className="text-sm text-muted-foreground">{brief.meta_description}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {brief.keyword_cluster && (
                <div className="p-4 border rounded-lg">
                  <h4 className="text-sm font-semibold mb-2">Keyword Cluster</h4>
                  <div className="flex flex-wrap gap-2">
                    {brief.keyword_cluster.map((kw, i) => (
                      <span key={i} className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 border rounded-lg">
                <h4 className="text-sm font-semibold mb-2">Suggested Category</h4>
                <span className="px-3 py-1 bg-muted rounded-full text-sm">{brief.suggested_category}</span>
              </div>

              {brief.suggested_tags && (
                <div className="p-4 border rounded-lg">
                  <h4 className="text-sm font-semibold mb-2">Suggested Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {brief.suggested_tags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 border rounded-md text-xs">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {brief.target_audience && (
                <div className="p-4 border rounded-lg">
                  <h4 className="text-sm font-semibold mb-2">Target Audience</h4>
                  <p className="text-sm text-muted-foreground">{brief.target_audience}</p>
                </div>
              )}

              {brief.estimated_reading_time && (
                <div className="p-4 border rounded-lg">
                  <h4 className="text-sm font-semibold mb-2">Estimated Reading Time</h4>
                  <span className="px-3 py-1 bg-muted rounded-full text-sm">{brief.estimated_reading_time}</span>
                </div>
              )}

              {brief.content_type && (
                <div className="p-4 border rounded-lg">
                  <h4 className="text-sm font-semibold mb-2">Content Type</h4>
                  <span className="px-3 py-1 bg-muted rounded-full text-sm capitalize">{brief.content_type}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Saved Research */}
      <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          Recent Content
        </h3>
        {loading ? (
          <div className="h-32 flex items-center justify-center text-muted-foreground">Loading...</div>
        ) : savedBriefs.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-muted-foreground">
            <FileText className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">No content yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedBriefs.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.status === "published" ? "bg-green-500/10 text-green-500" :
                    item.status === "draft" ? "bg-amber-500/10 text-amber-500" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {item.status}
                  </span>
                  <span className="text-sm font-medium truncate max-w-md">{item.topic}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
