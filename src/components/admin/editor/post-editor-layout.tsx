"use client"

import { useState, useEffect, useCallback } from "react"
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
import { Save, Send, Eye, ArrowLeft, Loader2, Share2 } from "lucide-react"
import { SocialShareDialog } from "@/components/admin/social-share-dialog"

export function PostEditorLayout() {
  const router = useRouter()
  const { post, isSaving, loading, dirty, lastSaved, saveDraft, publish } = usePostEditor()
  const [shareOpen, setShareOpen] = useState(false)

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
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B]" />
          <p className="text-sm text-gray-500 dark:text-[#6B7280]">Loading editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/posts")}
            className="text-gray-400 hover:text-gray-600 dark:text-[#6B7280] dark:hover:text-[#F9FAFB] transition-colors p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1F2937]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-[#F9FAFB] truncate max-w-md">
            {post.id ? (post.title || "Edit Post") : "New Post"}
          </h1>
          {post.id && (
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              post.status === "published" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
              post.status === "draft" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
              post.status === "scheduled" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" :
              "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
            }`}>
              {post.status}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {lastSaved && (
            <span className="text-xs text-gray-400 dark:text-[#6B7280] hidden sm:block">
              {dirty ? "Unsaved changes" : `Saved ${lastSaved.toLocaleTimeString()}`}
            </span>
          )}
          <button
            onClick={saveDraft}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#1F2937] border-2 border-gray-300 dark:border-[#374151] rounded-lg hover:bg-gray-50 dark:hover:bg-[#374151] disabled:opacity-50 transition-all shadow-sm"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="hidden sm:inline">{isSaving ? "Saving..." : "Save Draft"}</span>
            <span className="text-[10px] text-gray-400 dark:text-[#6B7280] hidden md:inline">Ctrl+S</span>
          </button>
          <button
            onClick={() => window.open(`/preview/${post.slug || slugify(post.title)}`, "_blank")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#1F2937] border-2 border-gray-300 dark:border-[#374151] rounded-lg hover:bg-gray-50 dark:hover:bg-[#374151] transition-all shadow-sm"
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Preview</span>
          </button>
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#1F2937] border-2 border-gray-300 dark:border-[#374151] rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 transition-all shadow-sm"
          >
            <Share2 className="h-4 w-4 text-[#F59E0B]" />
            <span className="hidden sm:inline">Share</span>
          </button>
          <button
            onClick={publish}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-gray-300 dark:disabled:bg-[#374151] disabled:text-gray-500 dark:disabled:text-[#6B7280] rounded-lg transition-all shadow-sm shadow-[#F59E0B]/20"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Publish</span>
            <span className="text-[10px] text-white/70 hidden md:inline">Ctrl+Enter</span>
          </button>
        </div>
      </div>

      <SocialShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        post={{
          id: post.id || "",
          slug: post.slug || slugify(post.title),
          title: post.title || "",
          excerpt: post.excerpt || "",
          featured_image: post.featured_image || post.og_image || "",
          tags: post.tags || [],
        }}
      />

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
