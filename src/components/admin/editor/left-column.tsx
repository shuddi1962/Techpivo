"use client"

import { usePostEditor } from "./post-editor-provider"
import { RichTextEditor } from "./rich-text-editor"

export function LeftColumn() {
  const { post, setField } = usePostEditor()

  const handleTitleChange = (value: string) => {
    setField("title", value)
    if (!post.id && post.slug === slugify(post.title)) {
      setField("slug", slugify(value))
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-[#111827] border-2 border-gray-300 dark:border-[#374151] rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <input
            value={post.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Add title"
            className="w-full bg-transparent text-2xl font-bold text-gray-900 dark:text-[#F9FAFB] placeholder:text-gray-400 dark:placeholder:text-[#4B5563] border-none focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#6B7280]">
          <span className="shrink-0">{process.env.NEXT_PUBLIC_SITE_URL || "www.Techpivo.com"}/</span>
          <input
            value={post.slug}
            onChange={(e) => setField("slug", e.target.value)}
            placeholder="post-slug"
            className="bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-1.5 text-gray-900 dark:text-[#F9FAFB] flex-1 focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent font-mono text-sm"
          />
          <button
            onClick={() => setField("slug", slugify(post.title))}
            className="text-xs font-medium text-[#F59E0B] hover:text-[#D97706] whitespace-nowrap px-2 py-1 rounded-md hover:bg-[#F59E0B]/10 transition-colors"
          >
            Generate
          </button>
        </div>
      </div>

      <RichTextEditor />

      <div className="bg-white dark:bg-[#111827] border-2 border-gray-300 dark:border-[#374151] rounded-xl shadow-sm p-6">
        <label className="block text-sm font-semibold text-gray-700 dark:text-[#F9FAFB] mb-2">Excerpt</label>
        <textarea
          value={post.excerpt}
          onChange={(e) => setField("excerpt", e.target.value)}
          placeholder="Write a brief excerpt..."
          rows={3}
          className="w-full bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-2 text-gray-900 dark:text-[#F9FAFB] placeholder:text-gray-400 dark:placeholder:text-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent resize-y text-sm"
        />
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-2 flex-1">
            <div className="h-1.5 flex-1 rounded-full bg-gray-100 dark:bg-[#1F2937] max-w-xs overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  (post.excerpt || "").length > 160 ? "bg-red-500" : (post.excerpt || "").length > 120 ? "bg-green-500" : "bg-amber-500"
                }`}
                style={{ width: `${Math.min(100, ((post.excerpt || "").length / 160) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 dark:text-[#6B7280] font-medium">{(post.excerpt || "").length}/160</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111827] border-2 border-gray-300 dark:border-[#374151] rounded-xl shadow-sm p-6">
        <label className="block text-sm font-semibold text-gray-700 dark:text-[#F9FAFB] mb-3">Source Attribution</label>
        <div className="space-y-3">
          <input
            value={post.source_name}
            onChange={(e) => setField("source_name", e.target.value)}
            placeholder="Source name (e.g., TechCrunch)"
            className="w-full bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-2 text-gray-900 dark:text-[#F9FAFB] placeholder:text-gray-400 dark:placeholder:text-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
          />
          <input
            value={post.original_source_url}
            onChange={(e) => setField("original_source_url", e.target.value)}
            placeholder="Original source URL"
            className="w-full bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-2 text-gray-900 dark:text-[#F9FAFB] placeholder:text-gray-400 dark:placeholder:text-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
          />
        </div>
      </div>
    </div>
  )
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 200)
}
