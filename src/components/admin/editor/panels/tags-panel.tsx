"use client"

import { useState } from "react"
import { usePostEditor } from "../post-editor-provider"
import { CollapsibleSection } from "../collapsible-section"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tags, X, Plus } from "lucide-react"

export function TagsPanel() {
  const { post, updatePost } = usePostEditor()
  const [tagInput, setTagInput] = useState("")

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !post.tags.includes(tag)) {
      updatePost({ tags: [...post.tags, tag] })
      setTagInput("")
    }
  }

  const removeTag = (tag: string) => {
    updatePost({ tags: post.tags.filter((t) => t !== tag) })
  }

  return (
    <CollapsibleSection title="Tags" icon={<Tags className="h-4 w-4" />}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 min-h-[28px]">
          {post.tags.length === 0 && (
            <span className="text-xs text-gray-400 dark:text-[#6B7280]">No tags added</span>
          )}
          {post.tags.map((tag) => (
            <Badge
              key={tag}
              className="cursor-pointer bg-gray-100 text-gray-700 dark:bg-[#1F2937] dark:text-[#E5E7EB] hover:bg-gray-200 dark:hover:bg-[#374151] font-medium text-xs px-2.5 py-1 rounded-lg transition-colors border-2 border-gray-200 dark:border-[#374151]"
              onClick={() => removeTag(tag)}
            >
              {tag}
              <X className="h-3 w-3 ml-1.5 text-gray-400 dark:text-[#6B7280] hover:text-red-500" />
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Enter tag..."
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            className="bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] text-gray-900 dark:text-[#F9FAFB] placeholder:text-gray-400 dark:placeholder:text-[#4B5563] focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent h-9 text-sm"
          />
          <button
            onClick={addTag}
            className="px-3 py-1.5 bg-[#F59E0B] hover:bg-[#D97706] text-white text-sm font-medium rounded-lg transition-colors shrink-0 shadow-sm"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </CollapsibleSection>
  )
}
