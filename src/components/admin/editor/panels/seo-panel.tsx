"use client"

import { useState, useMemo } from "react"
import { usePostEditor } from "../post-editor-provider"
import { CollapsibleSection } from "../collapsible-section"
import { calculateSeoScore, generateSerpPreview } from "@/lib/seo-utils"
import { Search, CheckCircle2, XCircle, AlertTriangle, Globe, MessageCircle, Settings, Code, ChevronRight, Image } from "lucide-react"

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

export function SeoPanel() {
  const { post, updatePost, seoKeyword, setSeoKeyword } = usePostEditor()
  const [activeTab, setActiveTab] = useState("general")

  const { score, items } = useMemo(() => calculateSeoScore(seoKeyword, post), [seoKeyword, post])
  const serpPreview = useMemo(() => generateSerpPreview(post), [post])

  const passedItems = items.filter(i => i.check(post))
  const failedItems = items.filter(i => !i.check(post))

  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-[#10B981]"
    if (s >= 50) return "text-[#F59E0B]"
    return "text-[#EF4444]"
  }

  const getScoreBg = (s: number) => {
    if (s >= 80) return "bg-[#10B981]"
    if (s >= 50) return "bg-[#F59E0B]"
    return "bg-[#EF4444]"
  }

  const handleSeoTitleChange = (value: string) => {
    updatePost({ seo_title: value })
  }

  const handleSeoDescChange = (value: string) => {
    updatePost({ seo_description: value })
  }

  const highlightKeyword = (text: string, keyword: string) => {
    if (!keyword) return text
    const re = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
    return text.replace(re, "<mark class='bg-[#F59E0B]/30 text-[#F59E0B] rounded px-0.5'>$1</mark>")
  }

  return (
    <CollapsibleSection
      title={`SEO${seoKeyword ? ` (${score})` : ""}`}
      icon={<Search className="h-4 w-4" />}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1">Focus Keyword</label>
          <div className="relative">
            <input
              value={seoKeyword}
              onChange={(e) => setSeoKeyword(e.target.value)}
              placeholder="Enter focus keyword..."
              className="w-full bg-[#0A0F1E] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#F9FAFB] focus:outline-none focus:border-[#6366F1] pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <span className={`text-lg font-bold ${getScoreColor(score)}`}>{score}</span>
              <span className="text-[10px] text-[#6B7280]">/100</span>
            </span>
          </div>
        </div>

        <div className="w-full bg-[#1F2937] rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getScoreBg(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>

        <div className="bg-[#0A0F1E] rounded-lg p-3 space-y-2">
          <label className="block text-xs text-[#9CA3AF]">Google SERP Preview</label>
          <div className="bg-white rounded-lg p-3">
            <p className="text-[#1A0DAB] text-sm font-medium leading-5 truncate hover:underline cursor-pointer">
              {serpPreview.title}
            </p>
            <p className="text-[#006621] text-xs leading-4 truncate">{serpPreview.url}</p>
            <p className="text-[#545454] text-xs leading-4 mt-0.5 line-clamp-2">{serpPreview.description}</p>
          </div>
        </div>

        <div className="flex border-b border-[#1F2937]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "text-[#6366F1] border-[#6366F1]"
                  : "text-[#6B7280] border-transparent hover:text-[#F9FAFB]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "general" && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs text-[#9CA3AF]">SEO Title</label>
                <span className="text-[10px] text-[#6B7280]">{(post.seo_title || post.title || "").length} / 60</span>
              </div>
              <input
                value={post.seo_title || ""}
                onChange={(e) => handleSeoTitleChange(e.target.value)}
                placeholder={post.title || "SEO title..."}
                className="w-full bg-[#0A0F1E] border border-[#1F2937] rounded px-2 py-1.5 text-sm text-[#F9FAFB] focus:outline-none focus:border-[#6366F1] mt-1"
              />
              <div className="w-full bg-[#1F2937] rounded-full h-1 mt-1 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    (post.seo_title || post.title).length > 60 ? "bg-[#EF4444]" :
                    (post.seo_title || post.title).length >= 40 ? "bg-[#10B981]" : "bg-[#F59E0B]"
                  }`}
                  style={{ width: `${Math.min(100, ((post.seo_title || post.title).length / 60) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs text-[#9CA3AF]">Meta Description</label>
                <span className="text-[10px] text-[#6B7280]">{(post.seo_description || post.excerpt || "").length} / 160</span>
              </div>
              <textarea
                value={post.seo_description || ""}
                onChange={(e) => handleSeoDescChange(e.target.value)}
                placeholder={post.excerpt || "Meta description..."}
                rows={3}
                className="w-full bg-[#0A0F1E] border border-[#1F2937] rounded px-2 py-1.5 text-sm text-[#F9FAFB] focus:outline-none focus:border-[#6366F1] mt-1 resize-none"
              />
              <div className="w-full bg-[#1F2937] rounded-full h-1 mt-1 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    (post.seo_description || post.excerpt).length > 160 ? "bg-[#EF4444]" :
                    (post.seo_description || post.excerpt).length >= 120 ? "bg-[#10B981]" : "bg-[#F59E0B]"
                  }`}
                  style={{ width: `${Math.min(100, ((post.seo_description || post.excerpt).length / 160) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#9CA3AF] mb-1">Secondary Keywords</label>
              <div className="flex flex-wrap gap-1 mb-1">
                {post.secondary_keywords.map((kw, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-[#1F2937] text-[#F9FAFB] text-xs rounded px-2 py-0.5">
                    {kw}
                    <button onClick={() => updatePost({ secondary_keywords: post.secondary_keywords.filter((_, j) => j !== i) })} className="text-[#6B7280] hover:text-[#EF4444]">
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                placeholder="Add keyword, press Enter"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const value = (e.target as HTMLInputElement).value.trim()
                    if (value && !post.secondary_keywords.includes(value)) {
                      updatePost({ secondary_keywords: [...post.secondary_keywords, value] })
                    }
                    (e.target as HTMLInputElement).value = ""
                  }
                }}
                className="w-full bg-[#0A0F1E] border border-[#1F2937] rounded px-2 py-1.5 text-sm text-[#F9FAFB] focus:outline-none focus:border-[#6366F1]"
              />
            </div>

            <div className="border-t border-[#1F2937] pt-3">
              <label className="block text-xs text-[#9CA3AF] mb-2">SEO Checklist</label>
              <div className="space-y-1.5">
                {items.map((item) => {
                  const passed = item.check(post)
                  return (
                    <div key={item.id} className="flex items-start gap-2">
                      {passed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981] mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-[#6B7280] mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${passed ? "text-[#10B981]" : "text-[#9CA3AF]"}`}>{item.label}</p>
                      </div>
                      <span className="text-[10px] text-[#6B7280] shrink-0">{item.weight}pts</span>
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
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-[#1877F2]" />
                <span className="text-xs font-medium text-[#F9FAFB]">Facebook (OG)</span>
              </div>
              <input
                value={post.og_title || ""}
                onChange={(e) => updatePost({ og_title: e.target.value })}
                placeholder="OG Title"
                className="w-full bg-[#0A0F1E] border border-[#1F2937] rounded px-2 py-1.5 text-sm text-[#F9FAFB] focus:outline-none focus:border-[#6366F1] mb-1"
              />
              <textarea
                value={post.og_description || ""}
                onChange={(e) => updatePost({ og_description: e.target.value })}
                placeholder="OG Description"
                rows={2}
                className="w-full bg-[#0A0F1E] border border-[#1F2937] rounded px-2 py-1.5 text-sm text-[#F9FAFB] focus:outline-none focus:border-[#6366F1] mb-1 resize-none"
              />
              <div className="bg-[#1a1f2e] rounded-lg p-2 flex items-center gap-2">
                {post.og_image || post.featured_image ? (
                  <img src={post.og_image || post.featured_image} alt="" className="w-12 h-12 rounded object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded bg-[#1F2937] flex items-center justify-center text-[#6B7280]">
                    <Image className="h-5 w-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#F9FAFB] truncate">{post.og_title || post.seo_title || post.title}</p>
                  <p className="text-[10px] text-[#6B7280] truncate">{process.env.NEXT_PUBLIC_SITE_URL || "blizine.com"}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-[#1F2937] pt-3">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="h-4 w-4 text-[#1DA1F2]" />
                <span className="text-xs font-medium text-[#F9FAFB]">Twitter (X)</span>
              </div>
              <input
                value={post.twitter_title || ""}
                onChange={(e) => updatePost({ twitter_title: e.target.value })}
                placeholder="Twitter Title"
                className="w-full bg-[#0A0F1E] border border-[#1F2937] rounded px-2 py-1.5 text-sm text-[#F9FAFB] focus:outline-none focus:border-[#6366F1] mb-1"
              />
              <textarea
                value={post.twitter_description || ""}
                onChange={(e) => updatePost({ twitter_description: e.target.value })}
                placeholder="Twitter Description"
                rows={2}
                className="w-full bg-[#0A0F1E] border border-[#1F2937] rounded px-2 py-1.5 text-sm text-[#F9FAFB] focus:outline-none focus:border-[#6366F1] mb-1 resize-none"
              />
            </div>
          </div>
        )}

        {activeTab === "schema" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#9CA3AF] mb-1">Schema Type</label>
              <select
                value={post.schema_type}
                onChange={(e) => updatePost({ schema_type: e.target.value })}
                className="w-full bg-[#0A0F1E] border border-[#1F2937] rounded px-2 py-1.5 text-sm text-[#F9FAFB] focus:outline-none focus:border-[#6366F1]"
              >
                {schemaTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            {post.schema_type && (
              <div className="bg-[#0A0F1E] rounded p-2">
                <p className="text-[10px] text-[#6B7280] font-mono">
                  {`<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "${post.schema_type}",\n  "headline": "${post.title}",\n  ...\n}\n</script>`}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "advanced" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[#9CA3AF] mb-1">Canonical URL</label>
              <input
                value={post.canonical_url || ""}
                onChange={(e) => updatePost({ canonical_url: e.target.value })}
                placeholder="https://..."
                className="w-full bg-[#0A0F1E] border border-[#1F2937] rounded px-2 py-1.5 text-sm text-[#F9FAFB] focus:outline-none focus:border-[#6366F1]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#9CA3AF] mb-1">Breadcrumb Title</label>
              <input
                value={post.breadcrumb_title || ""}
                onChange={(e) => updatePost({ breadcrumb_title: e.target.value })}
                placeholder={post.title || "Breadcrumb title..."}
                className="w-full bg-[#0A0F1E] border border-[#1F2937] rounded px-2 py-1.5 text-sm text-[#F9FAFB] focus:outline-none focus:border-[#6366F1]"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={post.robots_noindex}
                  onChange={(e) => updatePost({ robots_noindex: e.target.checked })}
                  className="rounded border-[#1F2937] bg-[#0A0F1E] text-[#6366F1]"
                />
                <span className="text-xs text-[#9CA3AF]">No Index (robots noindex)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={post.robots_nofollow}
                  onChange={(e) => updatePost({ robots_nofollow: e.target.checked })}
                  className="rounded border-[#1F2937] bg-[#0A0F1E] text-[#6366F1]"
                />
                <span className="text-xs text-[#9CA3AF]">No Follow (robots nofollow)</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}
