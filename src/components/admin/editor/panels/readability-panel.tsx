"use client"

import { useMemo, useState } from "react"
import { usePostEditor } from "../post-editor-provider"
import { CollapsibleSection } from "../collapsible-section"
import { improveReadability } from "@/lib/editor-autofix"
import { calculateReadability } from "@/lib/seo-utils"
import { BarChart3, Wand2, Loader2 } from "lucide-react"

function stripHtmlForStats(html: string): string {
  if (!html) return ""
  let text = html
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
  text = text.replace(/<[^>]+>/g, " ")
  text = text.replace(/https?:\/\/[^\s<>"']+/gi, " ")
  text = text.replace(/&nbsp;/gi, " ")
  text = text.replace(/&amp;/gi, "&")
  text = text.replace(/&lt;/gi, "<")
  text = text.replace(/&gt;/gi, ">")
  text = text.replace(/&quot;/gi, '"')
  text = text.replace(/&#x?[0-9a-fA-F]+;/g, " ")
  return text.replace(/\s+/g, " ").trim()
}

export function ReadabilityPanel() {
  const { post, updatePost } = usePostEditor()
  const [fixing, setFixing] = useState(false)

  const stats = useMemo(() => {
    const text = stripHtmlForStats(post.content)
    const words = text.split(/\s+/).filter(Boolean).length
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length
    const longSentences = text.split(/[.!?]+/).filter(s => s.split(/\s+/).filter(Boolean).length > 25).length
    const avgWordsPerSentence = sentences > 0 ? (words / sentences).toFixed(1) : "0"
    const live = calculateReadability(post.content)
    return { words, sentences, longSentences, avgWordsPerSentence, live }
  }, [post.content])

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400"
    if (score >= 60) return "text-amber-600 dark:text-amber-400"
    if (score >= 40) return "text-orange-600 dark:text-orange-400"
    return "text-red-600 dark:text-red-400"
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-500"
    if (score >= 60) return "bg-amber-500"
    if (score >= 40) return "bg-orange-500"
    return "bg-red-500"
  }

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Very Easy"
    if (score >= 80) return "Easy"
    if (score >= 70) return "Fairly Easy"
    if (score >= 60) return "Standard"
    if (score >= 50) return "Fairly Difficult"
    if (score >= 30) return "Difficult"
    return "Very Confusing"
  }

  return (
    <CollapsibleSection title="Readability" icon={<BarChart3 className="h-4 w-4" />} defaultOpen={false}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-2xl font-bold ${getScoreColor(stats.live.score)}`}>{stats.live.score}</span>
            <span className="text-xs text-gray-400 dark:text-[#6B7280] ml-1 font-medium">/100</span>
          </div>
          <span className="text-xs font-semibold text-gray-500 dark:text-[#9CA3AF] bg-gray-50 dark:bg-[#1F2937] px-2.5 py-1 rounded-lg border-2 border-gray-200 dark:border-[#374151]">{getScoreLabel(stats.live.flesch)}</span>
        </div>

        <div className="w-full bg-gray-100 dark:bg-[#1F2937] rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getScoreBg(stats.live.score)}`}
            style={{ width: `${stats.live.score}%` }}
          />
        </div>

        {stats.live.flesch > 0 && (
          <p className="text-xs text-gray-400 dark:text-[#6B7280] font-medium">Flesch Reading Ease: {stats.live.flesch}</p>
        )}

        <div className="grid grid-cols-2 gap-3 border-t-2 border-gray-100 dark:border-[#1F2937] pt-4">
          {[
            { label: "Words", value: stats.words.toLocaleString(), color: "text-[#F59E0B]" },
            { label: "Sentences", value: stats.sentences, color: "text-green-600 dark:text-green-400" },
            { label: "Words/Sentence", value: stats.avgWordsPerSentence, color: "text-amber-600 dark:text-amber-400" },
            { label: "Long Sentences", value: stats.longSentences, color: stats.longSentences > 0 ? "text-orange-600 dark:text-orange-400" : "text-gray-600 dark:text-gray-400" },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-50 dark:bg-[#0A0F1E] rounded-xl p-3 text-center border-2 border-gray-200 dark:border-[#1F2937]">
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] font-medium text-gray-400 dark:text-[#6B7280] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {stats.longSentences > 0 && (
          <div className="border-t-2 border-gray-100 dark:border-[#1F2937] pt-4">
            <button
              onClick={() => {
                setFixing(true)
                updatePost({ content: improveReadability(post.content) })
                setTimeout(() => setFixing(false), 500)
              }}
              disabled={fixing}
              className="w-full flex items-center justify-center gap-2 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-gray-200 dark:disabled:bg-[#374151] disabled:text-gray-400 dark:disabled:text-[#6B7280] text-white text-xs font-semibold py-2 rounded-lg transition-colors shadow-sm"
            >
              {fixing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              {fixing ? "Improving readability..." : `Fix ${stats.longSentences} long sentence${stats.longSentences > 1 ? "s" : ""}`}
            </button>
            <p className="text-[10px] text-gray-400 dark:text-[#6B7280] mt-2 text-center">
              Splits long sentences at natural clause breaks (24 then 16 words) until the Flesch score reaches 50+ — updates live in the editor.
            </p>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}
