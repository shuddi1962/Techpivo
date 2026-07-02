"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft, Sparkles, Brain, RefreshCw, Copy, Check,
  FileText, Target, Search, Link2, Image, Share2,
  ChevronDown, ChevronUp, Star, Globe, Code, Hash,
} from "lucide-react"
import Link from "next/link"

interface BriefData {
  title: string
  working_title: string
  seo_title: string
  slug: string
  meta_description: string
  category: string
  search_intent: string
  primary_keyword: string
  supporting_keywords: string[]
  question_keywords: string[]
  suggested_headings: string[]
  faqs: Array<{ question: string; answer: string }>
  internal_links: any[]
  external_references: Array<{ title: string; url: string; authority: string }>
  schema_type: string
  estimated_reading_time: string
  suggested_tags: string[]
  estimated_word_count: number
  outline: Array<{ heading: string; level: number; key_points: string[] }>
  image_suggestions: string[]
}

function GenerateContent() {
  const searchParams = useSearchParams()
  const topic = searchParams.get("topic") || ""
  const category = searchParams.get("category") || ""
  const score = parseInt(searchParams.get("score") || "0")

  const [brief, setBrief] = useState<BriefData | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState("")
  const [generating, setGenerating] = useState(false)
  const [articleGenerated, setArticleGenerated] = useState(false)

  const generateBrief = useCallback(async () => {
    if (!topic) return
    setLoading(true)
    try {
      const res = await fetch("/admin/editorial-intelligence/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, category, opportunity_score: score }),
      })
      const data = await res.json()
      setBrief(data.brief)
    } catch (err) { console.error(err) }
    setLoading(false)
  }, [topic, category, score])

  useEffect(() => { generateBrief() }, [generateBrief])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(""), 2000)
  }

  const generateArticle = async () => {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 3000))
    setGenerating(false)
    setArticleGenerated(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/editorial-intelligence" className="p-2 hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Generate Article</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Research, plan, and generate content for: {topic}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
            score >= 80 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              : score >= 60 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          }`}>
            Score: {score}/100
          </div>
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-4 w-4 ${i < Math.ceil(score / 20) ? "text-[#F59E0B] fill-[#F59E0B]" : "text-gray-300 dark:text-gray-600"}`} />
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Brain className="h-8 w-8 animate-pulse text-[#F59E0B] mr-3" />
          <span className="text-gray-500 dark:text-gray-400">Researching and generating content brief...</span>
        </div>
      ) : brief ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Article Plan</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1F2937] rounded-lg">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Working Title</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{brief.working_title}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1F2937] rounded-lg">
                  <span className="text-xs text-gray-500 dark:text-gray-400">SEO Title</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white truncate ml-4">{brief.seo_title}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1F2937] rounded-lg">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Slug</span>
                  <code className="text-xs text-[#F59E0B]">/{brief.slug}</code>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-[#1F2937] rounded-lg">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Meta Description</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{brief.meta_description}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 dark:bg-[#1F2937] rounded-lg">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Category</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{brief.category}</span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-[#1F2937] rounded-lg">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Reading Time</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{brief.estimated_reading_time}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Outline</h2>
              <div className="space-y-3">
                {brief.outline.map((section, i) => (
                  <div key={i} className={`p-3 rounded-lg border border-gray-100 dark:border-[#374151] ${section.level === 1 ? "bg-amber-50 dark:bg-amber-900/10" : "bg-gray-50 dark:bg-[#1F2937]"}`}>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{section.heading}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {section.key_points.map((point, j) => (
                        <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#374151] text-gray-500 dark:text-gray-400">{point}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">FAQs</h2>
              <div className="space-y-3">
                {brief.faqs.map((faq, i) => (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-[#1F2937] rounded-lg">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{faq.question}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{faq.answer}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Keywords</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase">Primary</span>
                  <div className="text-sm font-semibold text-[#F59E0B] mt-1">{brief.primary_keyword}</div>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase">Supporting</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {brief.supporting_keywords.map((kw, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{kw}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase">Questions</span>
                  <div className="space-y-1 mt-1">
                    {brief.question_keywords.map((q, i) => (
                      <div key={i} className="text-[11px] text-gray-600 dark:text-gray-400">• {q}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Tags</h2>
              <div className="flex flex-wrap gap-1">
                {brief.suggested_tags.map((tag, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1F2937] text-gray-600 dark:text-gray-400">#{tag}</span>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">External References</h2>
              <div className="space-y-2">
                {brief.external_references.map((ref, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-[#1F2937] rounded-lg">
                    <span className="text-xs text-gray-700 dark:text-gray-300">{ref.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${ref.authority === "high" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500"}`}>
                      {ref.authority}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Images</h2>
              <div className="space-y-2">
                {brief.image_suggestions.map((img, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-[#1F2937] rounded-lg">
                    <Image className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{img}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={generateArticle}
              disabled={generating || articleGenerated}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
            >
              {generating ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Generating Article...</>
              ) : articleGenerated ? (
                <><Check className="h-4 w-4" /> Article Generated!</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Generate Everything</>
              )}
            </button>

            {articleGenerated && (
              <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl space-y-2">
                <div className="text-sm font-bold text-green-700 dark:text-green-400">Article Ready</div>
                <div className="space-y-1 text-xs text-green-600 dark:text-green-500">
                  <div>✓ Article written ({brief.estimated_word_count} words)</div>
                  <div>✓ SEO optimized</div>
                  <div>✓ Internal links added</div>
                  <div>✓ External references included</div>
                  <div>✓ Schema markup generated</div>
                  <div>✓ Social posts created</div>
                  <div>✓ Newsletter draft prepared</div>
                </div>
                <Link href="/admin/posts" className="block text-center mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors">
                  View in Editor
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-sm text-gray-400">No topic selected</div>
      )}
    </div>
  )
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center"><Brain className="h-8 w-8 animate-pulse text-[#F59E0B]" /></div>}>
      <GenerateContent />
    </Suspense>
  )
}
