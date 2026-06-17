"use client"

import { useState } from "react"
import { usePostEditor } from "../post-editor-provider"
import { CollapsibleSection } from "../collapsible-section"
import { Sparkles, Loader2, Globe, FileText, CheckCircle, AlertCircle, BarChart3 } from "lucide-react"

export function AiWritingPanel() {
  const { post, updatePost, seoKeyword } = usePostEditor()
  const [mode, setMode] = useState<"topic" | "url">("topic")
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [quota, setQuota] = useState<{ used: number; cap: number; remaining: number } | null>(null)
  const [lastResult, setLastResult] = useState<{ headline: string; elapsed: string } | null>(null)

  const handleGenerate = async () => {
    if (!input.trim()) {
      setError(mode === "topic" ? "Enter a topic or keyword" : "Enter a URL starting with https://")
      return
    }
    if (mode === "url" && !input.startsWith("http")) {
      setError("URL must start with http:// or https://")
      return
    }

    setLoading(true)
    setError("")
    setLastResult(null)

    try {
      const res = await fetch("/api/admin/ai-write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, input: input.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          setError(`Monthly quota reached (${data.quota?.used}/${data.quota?.cap}). Resets on the 1st.`)
          setQuota(data.quota)
        } else {
          setError(data.error || "AI writing failed. Try again.")
        }
        return
      }

      if (data.meta) {
        setQuota({
          used:      data.meta.quota_used,
          cap:       data.meta.quota_cap,
          remaining: data.meta.quota_remaining,
        })
      }

      setLastResult({
        headline: data.article.headline,
        elapsed:  data.meta?.elapsed_seconds || "?",
      })

      const a = data.article
      updatePost({
        title:            a.headline,
        content:          a.content,
        excerpt:          a.excerpt,
        seo_title:        a.seoTitle,
        seo_description:  a.seoDescription,
        seo_keywords:     a.seoKeywords,
        tags:             a.tags,
        quality_score:    a.qualityScore,
        is_breaking:      a.isBreaking,
        focus_keyword:    a.seoKeywords?.[0] || "",
        source_name:      a.suggestedCategory,
      })

    } catch (e) {
      setError("Network error. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const quotaPct = quota ? Math.round((quota.used / quota.cap) * 100) : 0
  const quotaColor = quotaPct < 60 ? "#10B981" : quotaPct < 85 ? "#F59E0B" : "#EF4444"

  return (
    <CollapsibleSection
      title="AI Research & Write"
      icon={<Sparkles className="h-4 w-4 text-amber-500" />}
      defaultOpen={true}
    >
      <div className="space-y-3">
        {quota && (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-[#0A0F1E] rounded-lg border border-gray-200 dark:border-[#1F2937]">
            <BarChart3 className="h-3.5 w-3.5 text-gray-400" />
            <div className="flex-1">
              <div className="h-1.5 rounded-full bg-gray-200 dark:bg-[#1F2937] overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${quotaPct}%`, background: quotaColor }} />
              </div>
            </div>
            <span className="text-[10px] font-medium text-gray-500 dark:text-[#6B7280] whitespace-nowrap">
              {quota.remaining}/{quota.cap} left
            </span>
          </div>
        )}

        <div className="flex border-2 border-gray-200 dark:border-[#1F2937] rounded-xl overflow-hidden">
          <button
            onClick={() => { setMode("topic"); setInput(""); setError("") }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all ${
              mode === "topic"
                ? "bg-[#F59E0B] text-white shadow-sm"
                : "text-gray-500 dark:text-[#6B7280] hover:text-gray-700 dark:hover:text-[#F9FAFB] bg-transparent"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            From Topic
          </button>
          <button
            onClick={() => { setMode("url"); setInput(""); setError("") }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all ${
              mode === "url"
                ? "bg-[#F59E0B] text-white shadow-sm"
                : "text-gray-500 dark:text-[#6B7280] hover:text-gray-700 dark:hover:text-[#F9FAFB] bg-transparent"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            From URL
          </button>
        </div>

        <div>
          {mode === "topic" ? (
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. OpenAI releases GPT-5 with real-time web browsing"
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              className="w-full bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-[#F9FAFB] placeholder:text-gray-400 dark:placeholder:text-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
            />
          ) : (
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste a news article URL..."
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              className="w-full bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-[#F9FAFB] placeholder:text-gray-400 dark:placeholder:text-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
            />
          )}
        </div>

        {seoKeyword && mode === "topic" && !input && (
          <p className="text-xs text-gray-500 dark:text-[#6B7280] font-medium">
            Using focus keyword: &ldquo;{seoKeyword}&rdquo;
          </p>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-gray-200 dark:disabled:bg-[#374151] disabled:text-gray-400 dark:disabled:text-[#6B7280] text-white text-sm font-semibold py-2.5 rounded-xl transition-all shadow-sm shadow-[#F59E0B]/20"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Researching & Writing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              AI Research & Write
            </>
          )}
        </button>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <span className="text-xs text-red-700 dark:text-red-400">{error}</span>
          </div>
        )}

        {lastResult && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            <div className="text-xs text-green-700 dark:text-green-400">
              <span className="font-semibold">Article generated</span>
              <br />
              {lastResult.headline.slice(0, 80)}
              <br />
              <span className="text-green-500/70">Took {lastResult.elapsed}s | Auto-filled editor fields</span>
            </div>
          </div>
        )}

        <p className="text-[10px] text-gray-400 dark:text-[#6B7280] text-center leading-relaxed">
          Powered by <strong>Gemini 2.5 Flash</strong> with Google Search Grounding.
          <br />
          Each write uses 1 of 2,000 monthly manual credits.
        </p>
      </div>
    </CollapsibleSection>
  )
}
