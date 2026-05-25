"use client"

import { useState, useEffect } from "react"
import { usePostEditor } from "../post-editor-provider"
import { CollapsibleSection } from "../collapsible-section"
import { Link2, ExternalLink, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface SuggestedLink {
  id: string
  title: string
  slug: string
  relevance: number
}

export function InternalLinksPanel() {
  const { post } = usePostEditor()
  const [suggestions, setSuggestions] = useState<SuggestedLink[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!post.title && !post.content) return

    const fetchSuggestions = async () => {
      setLoading(true)
      const supabase = createClient()
      const keywords = [post.title, ...post.tags, post.focus_keyword]
        .filter(Boolean)
        .flatMap(k => (k || "").split(/\s+/).filter(w => w.length > 3))
        .slice(0, 5)

      if (keywords.length === 0) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from("posts")
        .select("id, title, slug")
        .neq("id", post.id || "")
        .neq("status", "draft")
        .limit(10)

      if (data) {
        const scored = data.map((p) => {
          const titleWords = p.title.toLowerCase()
          const score = keywords.filter(k => titleWords.includes(k.toLowerCase())).length
          return { id: p.id, title: p.title, slug: p.slug, relevance: score }
        })
          .filter(s => s.relevance > 0)
          .sort((a, b) => b.relevance - a.relevance)
          .slice(0, 5)
        setSuggestions(scored)
      }
      setLoading(false)
    }

    const timer = setTimeout(fetchSuggestions, 1000)
    return () => clearTimeout(timer)
  }, [post.title, post.tags, post.focus_keyword, post.id])

  return (
    <CollapsibleSection title="Internal Links" icon={<Link2 className="h-4 w-4" />} defaultOpen={false}>
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-[#6B7280]" />
        </div>
      ) : suggestions.length > 0 ? (
        <div className="space-y-2">
          {suggestions.map((link) => (
            <div key={link.id} className="flex items-center justify-between bg-[#0A0F1E] rounded p-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#F9FAFB] truncate">{link.title}</p>
                <p className="text-[10px] text-[#6B7280]">/{link.slug}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <span className="text-[10px] text-[#6B7280]">{link.relevance * 20}%</span>
                <a
                  href={`/admin/posts/${link.id}/edit`}
                  target="_blank"
                  className="text-[#6366F1] hover:text-[#818CF8]"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#6B7280] py-2">No related posts found. Add more content to get suggestions.</p>
      )}
      {suggestions.length > 0 && (
        <p className="text-[10px] text-[#6B7280] mt-2">
          Tip: Use <code className="text-[#6366F1]">[keyword](/post-slug)</code> syntax to link.
        </p>
      )}
    </CollapsibleSection>
  )
}
