"use client"

import { useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { usePostEditor } from "./post-editor-provider"
import { LeftColumn } from "./left-column"
import { PublishPanel } from "./panels/publish-panel"
import { FormatPanel } from "./panels/format-panel"
import { CategoriesPanel } from "./panels/categories-panel"
import { TagsPanel } from "./panels/tags-panel"
import { FeaturedImagePanel } from "./panels/featured-image-panel"
import { SeoPanel } from "./panels/seo-panel"
import { AiWritingPanel } from "./panels/ai-writing-panel"
import { ReadabilityPanel } from "./panels/readability-panel"
import { InternalLinksPanel } from "./panels/internal-links-panel"
import { QuickBriefPanel } from "./panels/quick-brief-panel"
import { Save, Send, Eye, ArrowLeft, Loader2 } from "lucide-react"

export function PostEditorLayout() {
  const router = useRouter()
  const { post, isSaving, loading, dirty, lastSaved, saveDraft, publish } = usePostEditor()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault()
      saveDraft()
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      publish()
    }
  }, [saveDraft, publish])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/posts")}
            className="text-[#6B7280] hover:text-[#F9FAFB] transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-[#F9FAFB] truncate max-w-md">
            {post.id ? (post.title || "Edit Post") : "New Post"}
          </h1>
          {post.id && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              post.status === "published" ? "bg-[#10B981]/20 text-[#10B981]" :
              post.status === "draft" ? "bg-[#F59E0B]/20 text-[#F59E0B]" :
              post.status === "scheduled" ? "bg-[#6366F1]/20 text-[#6366F1]" :
              "bg-[#6B7280]/20 text-[#6B7280]"
            }`}>
              {post.status}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs text-[#6B7280] hidden sm:block">
              {dirty ? "Unsaved changes" : `Saved ${lastSaved.toLocaleTimeString()}`}
            </span>
          )}
          <button
            onClick={saveDraft}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-[#1F2937] rounded-lg text-[#F9FAFB] hover:bg-[#1a2235] disabled:opacity-50 transition-colors"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="hidden sm:inline">{isSaving ? "Saving..." : "Save"}</span>
            <span className="text-[10px] text-[#6B7280] hidden md:inline">Ctrl+S</span>
          </button>
          <button
            onClick={() => window.open(`/preview/${post.slug || slugify(post.title)}`, "_blank")}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-[#1F2937] rounded-lg text-[#F9FAFB] hover:bg-[#1a2235] transition-colors"
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Preview</span>
          </button>
          <button
            onClick={publish}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#6366F1] hover:bg-[#4F46E5] disabled:bg-[#374151] text-white rounded-lg transition-colors"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Publish</span>
            <span className="text-[10px] text-white/60 hidden md:inline">Ctrl+Enter</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <LeftColumn />
        </div>

        <div className="space-y-4">
          <PublishPanel />
          <FormatPanel />
          <CategoriesPanel />
          <TagsPanel />
          <FeaturedImagePanel />
          <SeoPanel />
          <AiWritingPanel />
          <ReadabilityPanel />
          <InternalLinksPanel />
          <QuickBriefPanel />
        </div>
      </div>
    </div>
  )
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim().slice(0, 200)
}
