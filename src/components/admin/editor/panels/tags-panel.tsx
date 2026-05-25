"use client"

import { useState } from "react"
import { usePostEditor } from "../post-editor-provider"
import { CollapsibleSection } from "../collapsible-section"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tags, X } from "lucide-react"

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
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {post.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer bg-[#1F2937] text-[#F9FAFB] hover:bg-[#374151]"
              onClick={() => removeTag(tag)}
            >
              {tag}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Add tag..."
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            className="bg-[#0A0F1E] border-[#1F2937] text-[#F9FAFB] placeholder:text-[#4B5563] h-8 text-sm"
          />
        </div>
      </div>
    </CollapsibleSection>
  )
}
