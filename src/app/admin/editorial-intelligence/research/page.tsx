"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Search, FileText, Globe, BookOpen, HelpCircle, RefreshCw, ExternalLink, Zap } from "lucide-react"

export default function ResearchPage() {
  const [topic, setTopic] = useState("")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runResearch = async () => {
    if (!topic.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/admin/editorial-intelligence/brief?topic=${encodeURIComponent(topic)}`)
      if (!res.ok) throw new Error("Research failed")
      const data = await res.json()
      setResults(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/editorial-intelligence" className="p-2 rounded-lg hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-6 w-6 text-primary" />
            AI Research Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Automatically gather official docs, keywords, FAQs, and news coverage</p>
        </div>
      </div>

      <div className="p-5 rounded-xl border bg-card">
        <div className="flex gap-3">
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === "Enter" && runResearch()}
            placeholder="Enter a topic to research (e.g., AI Agents, Windows 12, Next.js 16)"
            className="flex-1 px-4 py-3 rounded-lg border bg-background text-sm"
          />
          <button
            onClick={runResearch}
            disabled={loading || !topic.trim()}
            className="px-6 py-3 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Research
          </button>
        </div>
      </div>

      {results && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border bg-card text-center">
              <div className="text-2xl font-bold text-primary">{results.official_sources?.length + results.news_coverage?.length || 0}</div>
              <div className="text-xs text-muted-foreground">Sources Found</div>
            </div>
            <div className="p-4 rounded-xl border bg-card text-center">
              <div className="text-2xl font-bold text-primary">{results.keywords?.length || 0}</div>
              <div className="text-xs text-muted-foreground">Keywords Identified</div>
            </div>
            <div className="p-4 rounded-xl border bg-card text-center">
              <div className="text-2xl font-bold text-primary">{results.faqs?.length || 0}</div>
              <div className="text-xs text-muted-foreground">FAQs Generated</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border bg-card">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                Official Sources
              </h3>
              <div className="space-y-2">
                {results.official_sources?.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{s.title}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30">{s.authority}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-xl border bg-card">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-500" />
                News Coverage
              </h3>
              <div className="space-y-2">
                {results.news_coverage?.map((s: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/30">
                    <div className="text-sm font-medium">{s.title}</div>
                    <div className="text-xs text-muted-foreground">{s.source}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl border bg-card">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Search className="h-4 w-4 text-green-500" />
              Keyword Intelligence
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {results.keywords?.map((kw: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <div className="text-sm font-medium">{kw.keyword}</div>
                    <div className="text-xs text-muted-foreground">Vol: {(kw.volume || 0).toLocaleString()}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    (kw.difficulty || 50) < 30 ? "bg-green-100 text-green-700 dark:bg-green-900/30" :
                    (kw.difficulty || 50) < 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30" :
                    "bg-red-100 text-red-700 dark:bg-red-900/30"
                  }`}>
                    KD: {kw.difficulty || 50}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-xl border bg-card">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-purple-500" />
              Frequently Asked Questions
            </h3>
            <div className="space-y-2">
              {results.faqs?.map((faq: any, i: number) => (
                <div key={i} className="p-3 rounded-lg bg-muted/30">
                  <div className="text-sm font-medium">{faq.q || faq.question}</div>
                  <div className="text-xs text-muted-foreground mt-1">{faq.a || faq.answer}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Link href={`/admin/editorial-intelligence/generate?topic=${encodeURIComponent(topic)}`} className="px-6 py-3 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Generate Article from Research
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
