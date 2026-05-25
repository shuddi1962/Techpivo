"use client"

import { useState } from "react"
import { usePostEditor } from "../post-editor-provider"
import { CollapsibleSection } from "../collapsible-section"
import { FileText, Plus, X } from "lucide-react"

interface BriefItem {
  label: string
  value: string
}

export function QuickBriefPanel() {
  const { post, updatePost } = usePostEditor()
  const [items, setItems] = useState<BriefItem[]>(() => {
    if (post.quick_brief && Array.isArray(post.quick_brief)) {
      return post.quick_brief as unknown as BriefItem[]
    }
    return [
      { label: "Key Takeaways", value: "" },
      { label: "Target Audience", value: "" },
      { label: "Tone", value: "" },
    ]
  })

  const updateItem = (index: number, field: keyof BriefItem, value: string) => {
    const newItems = items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    setItems(newItems)
    updatePost({ quick_brief: newItems as any })
  }

  const addItem = () => {
    setItems([...items, { label: "", value: "" }])
  }

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    setItems(newItems)
    updatePost({ quick_brief: newItems as any })
  }

  return (
    <CollapsibleSection title="Quick Brief" icon={<FileText className="h-4 w-4" />} defaultOpen={false}>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2">
              <input
                value={item.label}
                onChange={(e) => updateItem(i, "label", e.target.value)}
                placeholder="Label"
                className="flex-1 bg-[#0A0F1E] border border-[#1F2937] rounded px-2 py-1 text-xs text-[#F9FAFB] placeholder:text-[#4B5563] focus:outline-none focus:border-[#6366F1]"
              />
              {items.length > 1 && (
                <button onClick={() => removeItem(i)} className="text-[#6B7280] hover:text-[#EF4444]">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <input
              value={item.value}
              onChange={(e) => updateItem(i, "value", e.target.value)}
              placeholder="Value"
              className="w-full bg-[#0A0F1E] border border-[#1F2937] rounded px-2 py-1 text-xs text-[#F9FAFB] placeholder:text-[#4B5563] focus:outline-none focus:border-[#6366F1]"
            />
          </div>
        ))}
        <button
          onClick={addItem}
          className="flex items-center gap-1 text-xs text-[#6366F1] hover:text-[#818CF8]"
        >
          <Plus className="h-3 w-3" />
          Add Field
        </button>
      </div>
    </CollapsibleSection>
  )
}
