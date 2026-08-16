"use client"

import { useState, useMemo } from "react"
import { usePostEditor } from "../post-editor-provider"
import { CollapsibleSection } from "../collapsible-section"
import { calculateSeoScore, generateSerpPreview } from "@/lib/seo-utils"
import {
  keywordSlug, keywordTitle, insertKeywordSentence, keywordFirstHeading,
  addInternalLinks, splitLongSentences, ensureKeywordDensity, improveReadability, splitLongParagraphs,
} from "@/lib/editor-autofix"
import { slugify } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import NextImage from "next/image"
import type { EditorPostState } from "@/types/editor"
import { Search, CheckCircle2, XCircle, Globe, MessageCircle, Image, Sparkles, ChevronDown, ChevronRight, Loader2, TrendingUp, Wand2 } from "lucide-react"
import { KeywordSuggest } from "../keyword-suggest"

const schemaTypes = [
  "Article", "NewsArticle", "BlogPosting", "TechArticle",
  "HowTo", "FAQPage", "Recipe", "Review", "Product",
]

const tabs = [
  { id: "general", label: "General" },
  { id: "social", label: "Social" },
  { id: "schema", label: "Schema" },
  { id: "advanced", label: "Advanced" },
]

const checklistGroups = [
  {
    label: "Keyword Usage",
    items: ["keyword_in_title", "keyword_in_first_para", "keyword_in_headings", "keyword_in_slug", "keyword_density"],
  },
  {
    label: "Content Quality",
    items: ["content_length", "readability_score", "images", "internal_links", "h2_headings", "paragraph_length"],
  },
  {
    label: "Meta & Social",
    items: ["title_length", "meta_desc_length", "featured_image_set", "excerpt_set", "schema_markup"],
  },
]

export function SeoPanel() {
  const { post, updatePost, seoKeyword, setSeoKeyword } = usePostEditor()
  const [activeTab, setActiveTab] = useState("general")
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([])
  const [aiFixing, setAiFixing] = useState(false)
  const [fixResult, setFixResult] = useState("")
  const [fixingId, setFixingId] = useState("")

  const { score, items } = useMemo(() => calculateSeoScore(seoKeyword, post), [seoKeyword, post])
  const serpPreview = useMemo(() => generateSerpPreview(post), [post])

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label])
  }

  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-green-600 dark:text-green-400"
    if (s >= 50) return "text-amber-600 dark:text-amber-400"
    return "text-red-600 dark:text-red-400"
  }

  const getScoreBg = (s: number) => {
    if (s >= 80) return "bg-green-500"
    if (s >= 50) return "bg-amber-500"
    return "bg-red-500"
  }

  const getItemById = (id: string) => items.find(i => i.id === id)

  const autoFixSeo = async () => {
    setAiFixing(true)
    setFixResult("")
    const failed = items.filter(i => !i.check(post))
    if (failed.length === 0) {
      setFixResult("All SEO checks pass! Nothing to fix.")
      setAiFixing(false)
      return
    }

    const prompt = `You are an SEO assistant. Fix the following issues for a blog post.

Post Title: "${post.title}"
Focus Keyword: "${seoKeyword}"
Content length: ${post.content.length} chars
Current slug: "${post.slug}"

The following SEO checks FAILED:
${failed.map(f => `  - ${f.label} (${f.weight}pts)`).join("\n")}

For each failed check, provide a specific actionable fix. Return a JSON object with:
{
  "suggested_title": string | null,
  "suggested_seo_title": string | null,
  "suggested_meta_description": string | null,
  "suggested_slug": string | null,
  "suggestions": string[]
}

Only provide fields that need changes. Return valid JSON only.`

    try {
      const res = await fetch("/api/openrouter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      const text = data.content || data.choices?.[0]?.message?.content || ""
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const fixes = JSON.parse(jsonMatch[0])
        if (fixes.suggested_title) updatePost({ title: fixes.suggested_title })
        if (fixes.suggested_seo_title) updatePost({ seo_title: fixes.suggested_seo_title })
        if (fixes.suggested_meta_description) updatePost({ seo_description: fixes.suggested_meta_description })
        if (fixes.suggested_slug) updatePost({ slug: fixes.suggested_slug })
        setFixResult(fixes.suggestions?.join("\n") || "Fixes applied!")
      } else {
        setFixResult(text.replace(/<[^>]*>/g, "").slice(0, 500))
      }
    } catch {
      setFixResult("Error contacting AI. Please try again.")
    }
    setAiFixing(false)
  }

  const fixItem = async (id: string) => {
    if (fixingId) return
    setFixingId(id)
    setFixResult("")
    try {
      switch (id) {
        case "keyword_in_title": {
          updatePost({ seo_title: keywordTitle(seoKeyword, post.seo_title || post.title) })
          break
        }
        case "keyword_in_slug": {
          updatePost({ slug: keywordSlug(seoKeyword, post.slug) })
          break
        }
        case "keyword_in_first_para": {
          updatePost({ content: insertKeywordSentence(post.content, seoKeyword) })
          break
        }
        case "keyword_in_headings": {
          updatePost({ content: keywordFirstHeading(post.content, seoKeyword) })
          break
        }
        case "keyword_density": {
          updatePost({ content: ensureKeywordDensity(post.content, seoKeyword) })
          break
        }
        case "readability_score": {
          updatePost({ content: improveReadability(post.content) })
          break
        }
        case "paragraph_length": {
          updatePost({ content: splitLongParagraphs(post.content) })
          break
        }
        case "internal_links": {
          const supabase = createClient()
          const { data } = await supabase
            .from("posts")
            .select("id, title, slug")
            .neq("id", post.id || "")
            .neq("status", "draft")
            .limit(10)
          if (data?.length) {
            const keywords = [post.title, ...post.tags, post.focus_keyword]
              .filter(Boolean)
              .flatMap((k) => String(k).split(/\s+/).filter((w) => w.length > 3))
              .slice(0, 6)
            const related = data
              .map((p) => {
                const rel = keywords.filter((w) => p.title.toLowerCase().includes(w.toLowerCase())).length
                return { title: p.title, slug: p.slug, rel }
              })
              .filter((p) => p.rel > 0)
              .sort((a, b) => b.rel - a.rel)
              .slice(0, 3)
            if (related.length > 0) {
              const { html } = addInternalLinks(post.content, related)
              updatePost({ content: html })
            } else {
              setFixResult("No related published posts found to link to.")
            }
          } else {
            setFixResult("No published posts found to link to.")
          }
          break
        }
        default:
          break
      }
    } catch {
      setFixResult("Fix failed. Try again.")
    }
    setFixingId("")
  }

  // Deterministic "Fix All" — no AI needed. Runs every auto-fixable check on one
  // working object (each transform sees the previous output) and applies a
  // SINGLE updatePost, so the checklist + score + editor all refresh instantly.
  const fixAllChecks = async () => {
    if (fixingId) return
    setFixingId("fix-all")
    setFixResult("")
    try {
      if (!seoKeyword) {
        setFixResult("Set a focus keyword first — the keyword checks need it.")
        setFixingId("")
        return
      }
      const applied: Partial<EditorPostState> = {}
      const changes: string[] = []
      const apply = (field: string, before: string, after: string) => {
        if (before !== after) changes.push(field)
      }

      apply("slug", post.slug, keywordSlug(seoKeyword, post.slug))
      if (changes.length && changes[changes.length - 1] === "slug") applied.slug = keywordSlug(seoKeyword, post.slug)
      const seoTitleFix = keywordTitle(seoKeyword, post.seo_title || post.title)
      apply("SEO title", post.seo_title || post.title, seoTitleFix)
      if (changes.includes("SEO title")) applied.seo_title = seoTitleFix

      let c = post.content
      const c1 = insertKeywordSentence(c, seoKeyword)
      apply("first paragraph", c, c1); c = c1
      const c2 = keywordFirstHeading(c, seoKeyword)
      apply("H2 heading", c, c2); c = c2
      const c3 = ensureKeywordDensity(c, seoKeyword)
      apply("keyword density", c, c3); c = c3
      const c4 = improveReadability(c)
      apply("readability", c, c4); c = c4
      const c5 = splitLongParagraphs(c)
      apply("paragraph length", c, c5); c = c5

      const supabase = createClient()
      const { data } = await supabase
        .from("posts")
        .select("id, title, slug")
        .neq("id", post.id || "")
        .neq("status", "draft")
        .limit(10)
      if (data?.length) {
        const keywords = [post.title, ...post.tags, seoKeyword]
          .filter(Boolean)
          .flatMap((k) => String(k).split(/\s+/).filter((w) => w.length > 3))
          .slice(0, 6)
        const related = data
          .map((p) => {
            const rel = keywords.filter((w) => p.title.toLowerCase().includes(w.toLowerCase())).length
            return { title: p.title, slug: p.slug, rel }
          })
          .filter((p) => p.rel > 0)
          .sort((a, b) => b.rel - a.rel)
          .slice(0, 3)
        if (related.length > 0) {
          const { html, added } = addInternalLinks(c, related)
          apply(added > 0 ? `${added} internal link${added > 1 ? "s" : ""}` : "internal links", c, html)
          c = html
        }
      }
      if (c !== post.content) applied.content = c

      if (Object.keys(applied).length > 0) {
        updatePost(applied)
        setFixResult(`Fixed: ${changes.join(", ")}. The checklist updates instantly.`)
      } else {
        setFixResult("Nothing to fix — all auto-fixable checks already pass.")
      }
    } catch {
      setFixResult("Fix failed. Try again.")
    }
    setFixingId("")
  }

  return (
    <CollapsibleSection
      title={`SEO${seoKeyword ? ` (${score})` : ""}`}
      icon={<Search className="h-4 w-4" />}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-[#9CA3AF] mb-1">Focus Keyword</label>
          <div className="relative">
            <KeywordSuggest
              value={seoKeyword}
              onChange={(v) => {
                setSeoKeyword(v)
                updatePost({ focus_keyword: v })
              }}
              placeholder="Enter focus keyword..."
              className="pr-14"
              rightElement={
                <span className="flex items-center gap-0.5">
                  <span className={`text-lg font-bold ${getScoreColor(score)}`}>{score}</span>
                  <span className="text-[10px] text-gray-400 dark:text-[#6B7280] font-medium">/100</span>
                </span>
              }
            />
          </div>
        </div>

        <div className="w-full bg-gray-100 dark:bg-[#1F2937] rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getScoreBg(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>

        <div className="bg-gray-50 dark:bg-[#0A0F1E] rounded-xl p-4 space-y-2 border-2 border-gray-200 dark:border-[#1F2937]">
          <label className="block text-xs font-medium text-gray-500 dark:text-[#9CA3AF]">Google SERP Preview</label>
          <div className="bg-white rounded-lg p-3 shadow-sm border-2 border-gray-100">
            <p className="text-[#1A0DAB] text-sm font-medium leading-5 truncate hover:underline cursor-pointer">
              {serpPreview.title}
            </p>
            <p className="text-[#006621] text-xs leading-4 truncate">{serpPreview.url}</p>
            <p className="text-[#545454] text-xs leading-4 mt-0.5 line-clamp-2">{serpPreview.description}</p>
          </div>
        </div>

        <div className="flex border-b-2 border-gray-200 dark:border-[#1F2937] gap-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "text-[#F59E0B] border-[#F59E0B]"
                  : "text-gray-400 dark:text-[#6B7280] border-transparent hover:text-gray-600 dark:hover:text-[#9CA3AF]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "general" && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-[#9CA3AF]">SEO Title</label>
                <span className="text-[10px] font-medium text-gray-400 dark:text-[#6B7280]">{(post.seo_title || post.title || "").length} / 60</span>
              </div>
              <input
                value={post.seo_title || ""}
                onChange={(e) => updatePost({ seo_title: e.target.value })}
                placeholder={post.title || "SEO title..."}
                className="w-full bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
              />
              <div className="w-full bg-gray-100 dark:bg-[#1F2937] rounded-full h-1 mt-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    (post.seo_title || post.title).length > 60 ? "bg-red-500" :
                    (post.seo_title || post.title).length >= 40 ? "bg-green-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.min(100, ((post.seo_title || post.title).length / 60) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-[#9CA3AF]">Meta Description</label>
                <span className="text-[10px] font-medium text-gray-400 dark:text-[#6B7280]">{(post.seo_description || post.excerpt || "").length} / 160</span>
              </div>
              <textarea
                value={post.seo_description || ""}
                onChange={(e) => updatePost({ seo_description: e.target.value })}
                placeholder={post.excerpt || "Meta description..."}
                rows={3}
                className="w-full bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent resize-none"
              />
              <div className="w-full bg-gray-100 dark:bg-[#1F2937] rounded-full h-1 mt-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    (post.seo_description || post.excerpt).length > 160 ? "bg-red-500" :
                    (post.seo_description || post.excerpt).length >= 120 ? "bg-green-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.min(100, ((post.seo_description || post.excerpt).length / 160) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-[#9CA3AF] mb-1.5">Secondary Keywords</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {post.secondary_keywords.map((kw, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-gray-100 dark:bg-[#1F2937] text-gray-700 dark:text-[#E5E7EB] text-xs font-medium rounded-lg px-2.5 py-1 border-2 border-gray-200 dark:border-[#374151]">
                    {kw}
                    <button onClick={() => updatePost({ secondary_keywords: post.secondary_keywords.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-500 transition-colors ml-0.5">
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <KeywordSuggest
                value=""
                onChange={() => {}}
                onSelect={(kw) => {
                  if (kw && !post.secondary_keywords.includes(kw)) {
                    updatePost({ secondary_keywords: [...post.secondary_keywords, kw] })
                  }
                }}
                placeholder="Type keyword and press Enter or select from suggestions..."
              />
            </div>

            <div className="border-t-2 border-gray-100 dark:border-[#1F2937] pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-gray-500 dark:text-[#9CA3AF] uppercase tracking-wider">
                  SEO Checklist ({items.filter(i => i.check(post)).length}/{items.length})
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={fixAllChecks}
                    disabled={!!fixingId}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-gray-200 dark:disabled:bg-[#374151] disabled:text-gray-400 dark:disabled:text-[#6B7280] text-white px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
                    title="Fix every auto-fixable check instantly (no AI needed)"
                  >
                    {fixingId === "fix-all" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                    {fixingId === "fix-all" ? "Fixing..." : "Fix All"}
                  </button>
                  <button
                    onClick={autoFixSeo}
                    disabled={aiFixing || !!fixingId}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#F59E0B] hover:text-[#D97706] disabled:text-gray-300 dark:disabled:text-[#6B7280] px-2.5 py-1.5 rounded-lg hover:bg-[#F59E0B]/10 transition-colors"
                  >
                    {aiFixing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {aiFixing ? "Fixing..." : "AI Auto-Fix"}
                  </button>
                </div>
              </div>

              {fixResult && (
                <div className="bg-[#F59E0B]/10 border-2 border-[#F59E0B]/20 rounded-xl p-3 mb-3">
                  <p className="text-xs text-[#F59E0B] font-medium whitespace-pre-wrap">{fixResult}</p>
                </div>
              )}

              <div className="space-y-2">
                {checklistGroups.map((group) => {
                  const groupItems = group.items.map(id => getItemById(id)).filter(Boolean)
                  if (groupItems.length === 0) return null
                  const groupPassed = groupItems.filter(i => i!.check(post)).length
                  const isCollapsed = collapsedGroups.includes(group.label)
                  return (
                    <div key={group.label} className="border-2 border-gray-100 dark:border-[#1F2937] rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleGroup(group.label)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#0A0F1E] hover:bg-gray-100 dark:hover:bg-[#1a2235] transition-colors"
                      >
                        <span className="text-xs font-semibold text-gray-600 dark:text-[#D1D5DB]">{group.label}</span>
                        <span className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold ${groupPassed === groupItems.length ? "text-green-500" : "text-amber-500"}`}>
                            {groupPassed}/{groupItems.length}
                          </span>
                          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
                        </span>
                      </button>
                      {!isCollapsed && (
                        <div className="px-3 py-2 space-y-2">
                          {groupItems.map((item) => {
                            if (!item) return null
                            const passed = item.check(post)
                            const fixable = [
                              "keyword_in_title", "keyword_in_slug", "keyword_in_first_para",
                              "keyword_in_headings", "keyword_density", "readability_score", "internal_links",
                              "paragraph_length",
                            ].includes(item.id)
                            return (
                              <div key={item.id} className="flex items-start gap-2.5">
                                {passed ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-gray-300 dark:text-[#4B5563] mt-0.5 shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-medium break-words ${passed ? "text-green-700 dark:text-green-400" : "text-gray-500 dark:text-[#9CA3AF]"}`}>
                                    {item.label}
                                  </p>
                                </div>
                                {!passed && fixable && (
                                  <button
                                    onClick={() => fixItem(item.id)}
                                    disabled={!!fixingId}
                                    className="flex items-center gap-1 shrink-0 text-[10px] font-semibold text-[#F59E0B] hover:text-[#D97706] hover:bg-[#F59E0B]/10 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                                    title="Auto-fix this check"
                                  >
                                    {fixingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                                    Fix
                                  </button>
                                )}
                                <span className={`text-[10px] font-semibold shrink-0 px-1.5 py-0.5 rounded ${
                                  passed
                                    ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                                    : "bg-gray-50 text-gray-400 dark:bg-[#1a2235] dark:text-[#6B7280]"
                                }`}>
                                  {item.weight}pts
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "social" && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-[#1877F2]" />
                <span className="text-xs font-semibold text-gray-700 dark:text-[#F9FAFB]">Facebook (OG)</span>
              </div>
              <input
                value={post.og_title || ""}
                onChange={(e) => updatePost({ og_title: e.target.value })}
                placeholder="OG Title"
                className="w-full bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent mb-2"
              />
              <textarea
                value={post.og_description || ""}
                onChange={(e) => updatePost({ og_description: e.target.value })}
                placeholder="OG Description"
                rows={2}
                className="w-full bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent mb-2 resize-none"
              />
              <div className="bg-gray-50 dark:bg-[#1a1f2e] rounded-xl p-3 flex items-center gap-3 border-2 border-gray-200 dark:border-[#1F2937]">
                {post.og_image || post.featured_image ? (
                  <NextImage src={post.og_image || post.featured_image} alt="" width={48} height={48} className="w-12 h-12 rounded-lg object-cover border-2 border-gray-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-[#1F2937] flex items-center justify-center border-2 border-gray-300 dark:border-[#374151]">
                    <Image className="h-5 w-5 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-[#F9FAFB] truncate">{post.og_title || post.seo_title || post.title}</p>
                  <p className="text-xs text-gray-500 dark:text-[#6B7280] truncate">{process.env.NEXT_PUBLIC_SITE_URL || "www.techpivo.com"}</p>
                </div>
              </div>
            </div>

            <div className="border-t-2 border-gray-100 dark:border-[#1F2937] pt-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="h-4 w-4 text-[#1DA1F2]" />
                <span className="text-xs font-semibold text-gray-700 dark:text-[#F9FAFB]">Twitter (X)</span>
              </div>
              <input
                value={post.twitter_title || ""}
                onChange={(e) => updatePost({ twitter_title: e.target.value })}
                placeholder="Twitter Title"
                className="w-full bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent mb-2"
              />
              <textarea
                value={post.twitter_description || ""}
                onChange={(e) => updatePost({ twitter_description: e.target.value })}
                placeholder="Twitter Description"
                rows={2}
                className="w-full bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent resize-none"
              />
            </div>
          </div>
        )}

        {activeTab === "schema" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-[#9CA3AF] mb-1.5">Schema Type</label>
              <select
                value={post.schema_type}
                onChange={(e) => updatePost({ schema_type: e.target.value })}
                className="w-full bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
              >
                {schemaTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            {post.schema_type && (
              <div className="bg-gray-50 dark:bg-[#0A0F1E] rounded-xl p-3 border-2 border-gray-200 dark:border-[#1F2937] overflow-x-auto min-w-0">
                <p className="text-[10px] text-gray-500 dark:text-[#6B7280] font-mono leading-relaxed whitespace-pre w-max min-w-full">
{`<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "${post.schema_type}",
  "headline": "${post.title}",
  ...
}
</script>`}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "advanced" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-[#9CA3AF] mb-1.5">Canonical URL</label>
              <input
                value={post.canonical_url || ""}
                onChange={(e) => updatePost({ canonical_url: e.target.value })}
                placeholder="https://..."
                className="w-full bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-[#9CA3AF] mb-1.5">Breadcrumb Title</label>
              <input
                value={post.breadcrumb_title || ""}
                onChange={(e) => updatePost({ breadcrumb_title: e.target.value })}
                placeholder={post.title || "Breadcrumb title..."}
                className="w-full bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
              />
            </div>

            <div className="space-y-3 py-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={post.robots_noindex}
                  onChange={(e) => updatePost({ robots_noindex: e.target.checked })}
                  className="w-4 h-4 rounded border-2 border-gray-300 dark:border-[#374151] text-[#F59E0B] focus:ring-[#F59E0B] bg-gray-50 dark:bg-[#0A0F1E]"
                />
                <span className="text-xs font-medium text-gray-600 dark:text-[#9CA3AF] group-hover:text-gray-900 dark:group-hover:text-[#F9FAFB] transition-colors">No Index (robots noindex)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={post.robots_nofollow}
                  onChange={(e) => updatePost({ robots_nofollow: e.target.checked })}
                  className="w-4 h-4 rounded border-2 border-gray-300 dark:border-[#374151] text-[#F59E0B] focus:ring-[#F59E0B] bg-gray-50 dark:bg-[#0A0F1E]"
                />
                <span className="text-xs font-medium text-gray-600 dark:text-[#9CA3AF] group-hover:text-gray-900 dark:group-hover:text-[#F9FAFB] transition-colors">No Follow (robots nofollow)</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}
