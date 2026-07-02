"use client"

import { useState } from "react"
import {
  Sparkles, Copy, Check, RefreshCw, MessageCircle,
  Send, Globe, AtSign, Share2, Hash, Megaphone,
} from "lucide-react"

interface CaptionStyle {
  name: string
  label: string
  icon: string
  description: string
}

const CAPTION_STYLES: CaptionStyle[] = [
  { name: "professional", label: "Professional", icon: "💼", description: "Authoritative and polished" },
  { name: "educational", label: "Educational", icon: "📚", description: "Informative and helpful" },
  { name: "conversational", label: "Conversational", icon: "💬", description: "Friendly and approachable" },
  { name: "breaking", label: "Breaking News", icon: "⚡", description: "Urgent and attention-grabbing" },
  { name: "curiosity", label: "Curiosity", icon: "🔍", description: "Teases and intrigues" },
  { name: "question", label: "Question", icon: "❓", description: "Engages with questions" },
]

const PLATFORMS = [
  { name: "X", icon: AtSign, color: "text-sky-500", limit: 280 },
  { name: "Facebook", icon: Globe, color: "text-blue-600", limit: 2000 },
  { name: "LinkedIn", icon: Share2, color: "text-blue-700", limit: 3000 },
  { name: "Instagram", icon: Megaphone, color: "text-pink-600", limit: 2200 },
]

export function AiCaptionStudio() {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [selectedStyle, setSelectedStyle] = useState("professional")
  const [selectedPlatform, setSelectedPlatform] = useState("X")
  const [captions, setCaptions] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState("")

  const generateCaptions = async () => {
    if (!title) return
    setGenerating(true)

    const results: Record<string, string> = {}
    for (const platform of PLATFORMS) {
      const style = CAPTION_STYLES.find(s => s.name === selectedStyle)
      const styleGuide = style?.description || ""
      const platformLimit = platform.limit

      let caption = ""
      if (selectedStyle === "breaking") {
        caption = `🚨 BREAKING: ${title}\n\n${content?.slice(0, 150) || "Full details inside."}\n\n#TechNews #Breaking`
      } else if (selectedStyle === "question") {
        caption = `What do you think about ${title.toLowerCase()}?\n\n${content?.slice(0, 150) || "Let us know your thoughts!"}\n\nRead more 👉`
      } else if (selectedStyle === "curiosity") {
        caption = `You won't believe what's happening with ${title.toLowerCase()} 🤯\n\n${content?.slice(0, 120) || "The details are surprising."}\n\nFull story 👉`
      } else {
        caption = `${title}\n\n${content?.slice(0, 200) || "Read the full article for more details."}`
      }

      if (caption.length > platformLimit) {
        caption = caption.slice(0, platformLimit - 3) + "..."
      }
      results[platform.name] = caption
    }

    setCaptions(results)
    setGenerating(false)
  }

  const copyCaption = (platform: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(platform)
    setTimeout(() => setCopied(""), 2000)
  }

  return (
    <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
      <div className="flex items-center gap-2.5 mb-6">
        <Sparkles className="h-5 w-5 text-[#F59E0B]" />
        <h2 className="text-base font-bold text-gray-900 dark:text-white">AI Caption Studio</h2>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Article Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Enter article title..."
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Content Summary</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={3}
            placeholder="Brief summary of the article..."
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent resize-none"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Caption Style</label>
        <div className="grid grid-cols-3 gap-2">
          {CAPTION_STYLES.map(style => (
            <button
              key={style.name}
              onClick={() => setSelectedStyle(style.name)}
              className={`p-2.5 rounded-lg text-left text-xs border-2 transition-colors ${
                selectedStyle === style.name
                  ? "border-[#F59E0B] bg-amber-50 dark:bg-amber-900/20"
                  : "border-gray-200 dark:border-[#374151] hover:border-gray-300 dark:hover:border-gray-500"
              }`}
            >
              <span className="text-base">{style.icon}</span>
              <div className="font-semibold text-gray-900 dark:text-white mt-1">{style.label}</div>
              <div className="text-gray-500 dark:text-gray-400 mt-0.5">{style.description}</div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={generateCaptions}
        disabled={!title || generating}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors"
      >
        {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {generating ? "Generating..." : "Generate Captions"}
      </button>

      {Object.keys(captions).length > 0 && (
        <div className="mt-6 space-y-3">
          {PLATFORMS.map(platform => {
            const Icon = platform.icon
            return (
              <div key={platform.name} className="border border-gray-200 dark:border-[#374151] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${platform.color}`} />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{platform.name}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{captions[platform.name]?.length}/{platform.limit}</span>
                  </div>
                  <button
                    onClick={() => copyCaption(platform.name, captions[platform.name])}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-[#F59E0B] hover:bg-gray-50 dark:hover:bg-[#1F2937] rounded transition-colors"
                  >
                    {copied === platform.name ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    {copied === platform.name ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{captions[platform.name]}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
