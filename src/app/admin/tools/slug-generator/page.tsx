"use client"

import { useState } from "react"
import { ArrowLeft, Copy, Check } from "lucide-react"
import Link from "next/link"

export default function SlugGeneratorPage() {
  const [input, setInput] = useState("")
  const [slug, setSlug] = useState("")
  const [copied, setCopied] = useState(false)

  const generate = () => {
    const s = input
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
    setSlug(s)
  }

  const copy = () => {
    navigator.clipboard.writeText(slug)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/tools" className="p-2 hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Slug Generator</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Generate SEO-friendly URL slugs</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6 max-w-xl space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Enter title or text</label>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && generate()}
            placeholder="e.g., Top 10 Best AI Tools in 2026"
            className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-[#1F2937] border-2 border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
          />
        </div>

        <button onClick={generate} className="w-full px-4 py-3 bg-[#F59E0B] hover:bg-[#D97706] text-white font-semibold rounded-lg transition-colors">
          Generate Slug
        </button>

        {slug && (
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-3 text-sm font-mono bg-gray-50 dark:bg-[#1F2937] border-2 border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white">
              {slug}
            </div>
            <button onClick={copy} className="p-3 hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg border-2 border-gray-200 dark:border-[#374151]">
              {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-gray-400" />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
