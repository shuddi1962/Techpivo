"use client"

import { usePostEditor } from "./post-editor-provider"
import { RichTextEditor } from "./rich-text-editor"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function LeftColumn() {
  const { post, setField, updatePost } = usePostEditor()

  const handleTitleChange = (value: string) => {
    setField("title", value)
    if (!post.id && post.slug === slugify(post.title)) {
      setField("slug", slugify(value))
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-6 space-y-4">
        <div>
          <input
            value={post.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Add title"
            className="w-full bg-transparent text-2xl font-bold text-[#F9FAFB] placeholder:text-[#4B5563] border-none focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <span>{process.env.NEXT_PUBLIC_SITE_URL || "blizine.com"}/</span>
          <input
            value={post.slug}
            onChange={(e) => setField("slug", e.target.value)}
            placeholder="post-slug"
            className="bg-[#0A0F1E] border border-[#1F2937] rounded px-2 py-1 text-[#F9FAFB] flex-1 focus:outline-none focus:border-[#6366F1] font-mono text-sm"
          />
          <button
            onClick={() => setField("slug", slugify(post.title))}
            className="text-xs text-[#6366F1] hover:text-[#818CF8] whitespace-nowrap"
          >
            Generate
          </button>
        </div>
      </div>

      <RichTextEditor />

      <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-6">
        <label className="block text-sm font-medium text-[#F9FAFB] mb-2">Excerpt</label>
        <Textarea
          value={post.excerpt}
          onChange={(e) => setField("excerpt", e.target.value)}
          placeholder="Write a brief excerpt..."
          rows={3}
          className="bg-[#0A0F1E] border-[#1F2937] text-[#F9FAFB] placeholder:text-[#4B5563] resize-y"
        />
        <p className="text-xs text-[#6B7280] mt-1">{(post.excerpt || "").length}/160 characters</p>
      </div>

      <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-6">
        <label className="block text-sm font-medium text-[#F9FAFB] mb-2">Source Attribution</label>
        <div className="space-y-3">
          <Input
            value={post.source_name}
            onChange={(e) => setField("source_name", e.target.value)}
            placeholder="Source name (e.g., TechCrunch)"
            className="bg-[#0A0F1E] border-[#1F2937] text-[#F9FAFB] placeholder:text-[#4B5563]"
          />
          <Input
            value={post.original_source_url}
            onChange={(e) => setField("original_source_url", e.target.value)}
            placeholder="Original source URL"
            className="bg-[#0A0F1E] border-[#1F2937] text-[#F9FAFB] placeholder:text-[#4B5563]"
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
