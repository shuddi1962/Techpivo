"use client"

import { useState, useEffect } from "react"
import { usePostEditor } from "../post-editor-provider"
import { CollapsibleSection } from "../collapsible-section"
import { slugify } from "@/lib/utils"
import { keywordSlug, keywordTitle, improveReadability, addInternalLinks } from "@/lib/editor-autofix"
import { createClient } from "@/lib/supabase/client"
import { Sparkles, Loader2, Globe, FileText, CheckCircle, AlertCircle } from "lucide-react"

export function AiWritingPanel() {
  const { post, updatePost, seoKeyword, categories } = usePostEditor()
  const [mode, setMode] = useState<"topic" | "url">("topic")
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [lastResult, setLastResult] = useState<{ headline: string; elapsed: string } | null>(null)
  const [imageNote, setImageNote] = useState("")

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
    setImageNote("")

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
        } else {
          setError(data.error || "AI writing failed. Try again.")
        }
        return
      }

      setLastResult({
        headline: data.article.headline,
        elapsed:  data.meta?.elapsed_seconds || "?",
      })

      const a = data.article
      const faq = Array.isArray(a.faq)
        ? (a.faq as Array<{ question: string; answer: string }>).filter((f) => f?.question && f?.answer)
        : []
      const source = data.meta?.source as { name?: string; url?: string } | null | undefined
      const excerpt = a.answerCapsule || a.seoDescription || a.keyPoints?.[0] || ""
      const category = categories.find((c) => c.slug === a.suggestedCategory)
      const featured = (a as { featured_image?: string }).featured_image || post.featured_image || ""

      updatePost({
        title:              a.headline,
        slug:               slugify(a.headline),
        content:            a.content,
        excerpt,
        featured_image:     featured,
        category_id:        category?.id || post.category_id,
        subcategory_id:     post.subcategory_id,
        tags:               Array.isArray(a.tags) ? a.tags : [],
        focus_keyword:      a.focusKeyword || a.seoKeywords?.[0] || "",
        seo_title:          a.seoTitle || a.headline,
        seo_description:    a.seoDescription || excerpt,
        seo_keywords:       Array.isArray(a.seoKeywords) ? a.seoKeywords : [],
        secondary_keywords: Array.isArray(a.secondaryKeywords) ? a.secondaryKeywords : [],
        quick_brief:        Array.isArray(a.quickBrief) ? (a.quickBrief as unknown as Record<string, unknown>) : null,
        key_points:         Array.isArray(a.keyPoints) ? a.keyPoints : [],
        faq:                faq.length ? faq : null,
        schema_type:        "Article",
        schema_data:        faq.length
          ? {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faq.map((f) => ({
                "@type": "Question",
                name: f.question,
                acceptedAnswer: { "@type": "Answer", text: f.answer },
              })),
            }
          : null,
        og_title:           a.seoTitle || a.headline,
        og_description:     a.seoDescription || excerpt,
        og_image:           featured,
        twitter_title:      a.seoTitle || a.headline,
        twitter_description: a.seoDescription || excerpt,
        twitter_image:      featured,
        quality_score:      a.qualityScore,
        is_breaking:        a.isBreaking,
        source_name:        source?.name || post.source_name,
        original_source_url: source?.url || post.original_source_url,
      })

      // Automatic polish so the SEO checklist passes from the start:
      // keyword-first slug + SEO title, and readability improved to Flesch 50+.
      const kw = a.focusKeyword || a.seoKeywords?.[0] || ""
      const baseContent = a.content || post.content
      const polishedContent = improveReadability(baseContent)
      const polish: Record<string, unknown> = {}
      if (polishedContent !== baseContent) polish.content = polishedContent
      if (kw) {
        const kwSlug = keywordSlug(kw, slugify(a.headline))
        if (kwSlug !== slugify(a.headline)) polish.slug = kwSlug
        polish.seo_title = keywordTitle(kw, a.seoTitle || a.headline)
      }
      if (Object.keys(polish).length > 0) updatePost(polish)

      // Auto internal links: link 1-3 related published posts into the content.
      void (async () => {
        try {
          const supabase = createClient()
          const { data } = await supabase
            .from("posts")
            .select("id, title, slug")
            .neq("id", post.id || "")
            .neq("status", "draft")
            .limit(10)
          if (!data?.length) return
          const kwList = [a.headline, ...(Array.isArray(a.tags) ? a.tags : [])]
            .filter(Boolean)
            .flatMap((k) => String(k).split(/\s+/).filter((w) => w.length > 3))
            .slice(0, 6)
          const related = data
            .map((p) => ({
              title: p.title,
              slug: p.slug,
              rel: kwList.filter((w) => p.title.toLowerCase().includes(w.toLowerCase())).length,
            }))
            .filter((x) => x.rel > 0)
            .sort((x, y) => y.rel - x.rel)
            .slice(0, 3)
          if (!related.length) return
          const { html } = addInternalLinks(polishedContent, related)
          if (html !== polishedContent) updatePost({ content: html })
        } catch { /* internal-link auto-fix is best-effort */ }
      })()

      // Web images are the default source site-wide — when the post has no
      // featured image yet, auto-fetch one from the live web search so the
      // article page always shows an image above the headline.
      if (!featured) {
        try {
          const imgRes = await fetch(
            `/api/google-images?query=${encodeURIComponent(a.headline.split(/\s+/).slice(0, 5).join(" "))}&engine=auto`
          )
          const imgData = await imgRes.json()
          const img = imgData.items?.find((i: any) => i?.src?.startsWith("http"))
          if (img?.src) {
            updatePost({ featured_image: img.src, og_image: img.src, twitter_image: img.src })
            setImageNote(
              `Featured image auto-fetched from live web search${imgData.source ? ` (${imgData.source})` : ""}.`
            )
          }
        } catch { /* image fetch is best-effort */ }
      }

    } catch (e) {
      setError("Network error. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <CollapsibleSection
      title="AI Research & Write"
      icon={<Sparkles className="h-4 w-4 text-amber-500" />}
      defaultOpen={true}
    >
      <div className="space-y-3">
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
              <span className="text-green-500/70">Took {lastResult.elapsed}s | Auto-filled title, content, SEO, FAQ, key points, quick brief, tags & category</span>
              {imageNote && (
                <>
                  <br />
                  <span className="text-green-500/70">{imageNote}</span>
                </>
              )}
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
