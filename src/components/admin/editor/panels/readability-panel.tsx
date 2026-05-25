"use client"

import { useMemo } from "react"
import { usePostEditor } from "../post-editor-provider"
import { CollapsibleSection } from "../collapsible-section"
import { BarChart3 } from "lucide-react"

export function ReadabilityPanel() {
  const { post, readability } = usePostEditor()

  const stats = useMemo(() => {
    const text = post.content.replace(/<[^>]*>/g, "")
    const words = text.split(/\s+/).filter(Boolean).length
    const sentences = text.split(/[.!?]+/).filter(Boolean).length
    const paragraphs = text.split(/\n\s*\n/).filter(Boolean).length
    const longSentences = text.split(/[.!?]+/).filter(s => s.split(/\s+/).filter(Boolean).length > 25).length
    const avgWordsPerSentence = sentences > 0 ? (words / sentences).toFixed(1) : "0"
    return { words, sentences, paragraphs, longSentences, avgWordsPerSentence }
  }, [post.content])

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-[#10B981]"
    if (score >= 60) return "text-[#F59E0B]"
    if (score >= 40) return "text-[#F97316]"
    return "text-[#EF4444]"
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-[#10B981]"
    if (score >= 60) return "bg-[#F59E0B]"
    if (score >= 40) return "bg-[#F97316]"
    return "bg-[#EF4444]"
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-2xl font-bold ${getScoreColor(readability.score)}`}>{readability.score}</span>
            <span className="text-xs text-[#6B7280] ml-1">/100</span>
          </div>
          <span className="text-xs text-[#9CA3AF]">{getScoreLabel(readability.flesch)}</span>
        </div>

        <div className="w-full bg-[#1F2937] rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getScoreBg(readability.score)}`}
            style={{ width: `${readability.score}%` }}
          />
        </div>

        {readability.flesch > 0 && (
          <p className="text-[10px] text-[#6B7280]">Flesch Reading Ease: {readability.flesch}</p>
        )}

        <div className="grid grid-cols-2 gap-2 border-t border-[#1F2937] pt-3">
          <div className="bg-[#0A0F1E] rounded p-2 text-center">
            <p className="text-lg font-bold text-[#F9FAFB]">{stats.words.toLocaleString()}</p>
            <p className="text-[10px] text-[#6B7280]">Words</p>
          </div>
          <div className="bg-[#0A0F1E] rounded p-2 text-center">
            <p className="text-lg font-bold text-[#F9FAFB]">{stats.sentences}</p>
            <p className="text-[10px] text-[#6B7280]">Sentences</p>
          </div>
          <div className="bg-[#0A0F1E] rounded p-2 text-center">
            <p className="text-lg font-bold text-[#F9FAFB]">{stats.avgWordsPerSentence}</p>
            <p className="text-[10px] text-[#6B7280]">Words/Sentence</p>
          </div>
          <div className="bg-[#0A0F1E] rounded p-2 text-center">
            <p className={`text-lg font-bold ${stats.longSentences > 0 ? "text-[#F59E0B]" : "text-[#F9FAFB]"}`}>{stats.longSentences}</p>
            <p className="text-[10px] text-[#6B7280]">Long Sentences</p>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  )
}
