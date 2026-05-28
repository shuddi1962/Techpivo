"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { usePostEditor } from "../post-editor-provider"
import { CollapsibleSection } from "../collapsible-section"
import { Link2, ExternalLink, Loader2, Search, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface PostResult {
  id: string
  title: string
  slug: string
}

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
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<PostResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

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
  }, [post.title, post.tags, post.focus_keyword, post.id, post.content])

  const searchPosts = useCallback(async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("posts")
      .select("id, title, slug")
      .ilike("title", `%${searchQuery}%`)
      .neq("id", post.id || "")
      .neq("status", "draft")
      .limit(10)
    if (data) setSearchResults(data)
    setSearching(false)
  }, [searchQuery, post.id])

  useEffect(() => {
    if (!showPicker) return
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showPicker])

  const insertLink = (title: string, slug: string) => {
    const linkMarkdown = `[[${title}](/${slug})]`
    const editor = document.querySelector(".ProseMirror")
    if (editor) {
      editor.dispatchEvent(new CustomEvent("insert-internal-link", { detail: { title, slug, html: `<a href="/${slug}" class="text-[#F59E0B] underline underline-offset-2 font-medium">${title}</a>` } }))
    }
    setShowPicker(false)
    setSearchResults([])
    setSearchQuery("")
  }

  return (
    <CollapsibleSection title="Internal Links" icon={<Link2 className="h-4 w-4" />} defaultOpen={false}>
      <div className="space-y-3">
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="w-full flex items-center gap-2 bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Insert Internal Link
          </button>

          {showPicker && (
            <div className="absolute bottom-full mb-2 left-0 right-0 bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-3">
                <div className="flex gap-2">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchPosts()}
                    placeholder="Search posts..."
                    className="flex-1 bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#F9FAFB] placeholder:text-gray-400 dark:placeholder:text-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                    autoFocus
                  />
                  <button
                    onClick={searchPosts}
                    disabled={searching}
                    className="bg-[#F59E0B] hover:bg-[#D97706] text-white px-3 py-2 rounded-lg transition-colors"
                  >
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto border-t-2 border-gray-100 dark:border-[#1F2937]">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => insertLink(p.title, p.slug)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#1a2235] transition-colors border-b border-gray-50 dark:border-[#1F2937] last:border-0"
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-[#F9FAFB] truncate">{p.title}</p>
                      <p className="text-xs text-gray-400 dark:text-[#6B7280] font-mono">/{p.slug}</p>
                    </button>
                  ))}
                </div>
              )}
              {searchResults.length === 0 && searchQuery && !searching && (
                <p className="text-xs text-gray-400 dark:text-[#6B7280] text-center py-4">No posts found</p>
              )}
            </div>
          )}
        </div>

        <div className="border-t-2 border-gray-100 dark:border-[#1F2937] pt-3">
          <label className="block text-xs font-semibold text-gray-500 dark:text-[#9CA3AF] mb-2 uppercase tracking-wider">Suggested Links</label>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-[#F59E0B]" />
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map((link) => (
                <div key={link.id} className="flex items-center justify-between bg-gray-50 dark:bg-[#0A0F1E] rounded-xl p-3 border-2 border-gray-200 dark:border-[#1F2937]">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-[#F9FAFB] truncate">{link.title}</p>
                    <p className="text-xs text-gray-400 dark:text-[#6B7280] font-mono">/{link.slug}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <button
                      onClick={() => insertLink(link.title, link.slug)}
                      className="text-[10px] font-semibold text-white bg-[#F59E0B] hover:bg-[#D97706] px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      Insert
                    </button>
                    <span className="text-[10px] font-semibold text-gray-400 dark:text-[#6B7280] bg-white dark:bg-[#1F2937] px-2 py-1 rounded-md border border-gray-200 dark:border-[#374151]">{link.relevance * 20}% match</span>
                    <a
                      href={`/admin/posts/${link.id}/edit`}
                      target="_blank"
                      className="text-[#F59E0B] hover:text-[#D97706] p-1.5 hover:bg-[#F59E0B]/10 rounded-lg transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center">
              <Link2 className="h-8 w-8 text-gray-300 dark:text-[#4B5563] mx-auto mb-2" />
              <p className="text-xs text-gray-400 dark:text-[#6B7280]">No related posts found.</p>
              <p className="text-[10px] text-gray-400 dark:text-[#6B7280] mt-1">Add more content to get suggestions</p>
            </div>
          )}
        </div>
      </div>
    </CollapsibleSection>
  )
}
