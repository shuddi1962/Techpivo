"use client"

import { useState } from "react"
import { ArrowLeft, Copy, Check } from "lucide-react"
import Link from "next/link"

export default function WordCounterPage() {
  const [text, setText] = useState("")
  const [copied, setCopied] = useState(false)

  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const chars = text.length
  const charsNoSpaces = text.replace(/\s/g, "").length
  const sentences = text.trim() ? text.split(/[.!?]+/).filter(s => s.trim()).length : 0
  const paragraphs = text.trim() ? text.split(/\n\n+/).filter(p => p.trim()).length : 0
  const readingTime = Math.max(1, Math.ceil(words / 200))
  const speakingTime = Math.max(1, Math.ceil(words / 130))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/tools" className="p-2 hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Word Counter</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Count words, characters, and sentences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={16}
            placeholder="Start typing or paste your text here..."
            className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-[#1F2937] border-2 border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent resize-none"
          />
        </div>

        <div className="space-y-3">
          {[
            { label: "Words", value: words },
            { label: "Characters", value: chars },
            { label: "Characters (no spaces)", value: charsNoSpaces },
            { label: "Sentences", value: sentences },
            { label: "Paragraphs", value: paragraphs },
            { label: "Reading Time", value: `${readingTime} min` },
            { label: "Speaking Time", value: `${speakingTime} min` },
          ].map(stat => (
            <div key={stat.label} className="flex items-center justify-between p-3 bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-lg">
              <span className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
