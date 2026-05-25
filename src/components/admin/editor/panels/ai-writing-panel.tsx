"use client"

import { useState } from "react"
import { usePostEditor } from "../post-editor-provider"
import { CollapsibleSection } from "../collapsible-section"
import { Sparkles, Wand2, Lightbulb, Loader2, ArrowRight, Copy, Check } from "lucide-react"

type AiMode = "generate" | "improve" | "analyze"

const prompts: Record<AiMode, string> = {
  generate: "Write an engaging tech blog post about: {topic}. Format with H2/H3 headings. Include introduction and conclusion. Output clean HTML.",
  improve: "Improve the following blog post. Fix grammar, enhance clarity, maintain the same structure and key points. Output as clean HTML:\n\n{content}",
  analyze: "Analyze this blog post and suggest keywords, readability improvements, and SEO enhancements:\n\n{content}",
}

export function AiWritingPanel() {
  const { post, updatePost, seoKeyword } = usePostEditor()
  const [mode, setMode] = useState<AiMode>("generate")
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState("")
  const [copied, setCopied] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    setResult("")

    let fullPrompt = prompts[mode]
    if (mode === "generate") {
      fullPrompt = fullPrompt.replace("{topic}", prompt || seoKeyword || "technology trends")
    } else {
      fullPrompt = fullPrompt.replace("{content}", post.content.slice(0, 10000))
    }

    try {
      const res = await fetch("/api/openrouter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt }),
      })
      const data = await res.json()
      const html = data.content || data.choices?.[0]?.message?.content || ""
      setResult(html)

      if (mode === "generate" && html) {
        const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
        if (titleMatch && !post.title) {
          updatePost({ title: titleMatch[1] })
        }
      }
    } catch {
      setResult("Error generating content. Please try again.")
    }
    setLoading(false)
  }

  const applyResult = () => {
    if (!result) return
    if (mode === "generate") {
      const bodyMatch = result.replace(/<h1[^>]*>[^<]+<\/h1>/i, "").trim()
      updatePost({ content: bodyMatch || result })
    } else if (mode === "improve") {
      updatePost({ content: result })
    }
  }

  const copyResult = () => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const modes: { id: AiMode; label: string; icon: typeof Sparkles }[] = [
    { id: "generate", label: "Generate", icon: Sparkles },
    { id: "improve", label: "Improve", icon: Wand2 },
    { id: "analyze", label: "Analyze", icon: Lightbulb },
  ]

  return (
    <CollapsibleSection
      title="AI Writing Assistant"
      icon={<Sparkles className="h-4 w-4 text-[#F59E0B]" />}
      defaultOpen={false}
    >
      <div className="space-y-3">
        <div className="flex border border-[#1F2937] rounded-lg overflow-hidden">
          {modes.map((m) => {
            const Icon = m.icon
            return (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setResult("") }}
                className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                  mode === m.id
                    ? "bg-[#6366F1] text-white"
                    : "bg-[#0A0F1E] text-[#6B7280] hover:text-[#F9FAFB]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {m.label}
              </button>
            )
          })}
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            mode === "generate" ? "Enter a topic or keyword..." :
            mode === "improve" ? "Describe how to improve the content..." :
            "What aspects to analyze?"
          }
          rows={3}
          className="w-full bg-[#0A0F1E] border border-[#1F2937] rounded px-3 py-2 text-sm text-[#F9FAFB] placeholder:text-[#4B5563] focus:outline-none focus:border-[#6366F1] resize-none"
        />

        {mode === "generate" && seoKeyword && !prompt && (
          <p className="text-xs text-[#6B7280]">Using focus keyword: &ldquo;{seoKeyword}&rdquo;</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] disabled:bg-[#374151] text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {mode === "generate" ? "Generate Content" : mode === "improve" ? "Improve Content" : "Analyze Content"}
            </>
          )}
        </button>

        {result && (
          <div className="bg-[#0A0F1E] border border-[#1F2937] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#F9FAFB]">Result</span>
              <div className="flex items-center gap-1">
                {(mode === "generate" || mode === "improve") && (
                  <button
                    onClick={applyResult}
                    className="flex items-center gap-1 text-xs text-[#6366F1] hover:text-[#818CF8] px-2 py-1 rounded hover:bg-[#1F2937]"
                  >
                    <ArrowRight className="h-3 w-3" />
                    Apply
                  </button>
                )}
                <button
                  onClick={copyResult}
                  className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#F9FAFB] px-2 py-1 rounded hover:bg-[#1F2937]"
                >
                  {copied ? <Check className="h-3 w-3 text-[#10B981]" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div className="text-xs text-[#D1D5DB] max-h-40 overflow-y-auto leading-relaxed whitespace-pre-wrap">
              {result.replace(/<[^>]*>/g, "").slice(0, 1000)}
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}
