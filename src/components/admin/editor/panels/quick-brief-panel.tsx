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
          <div key={i} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                value={item.label}
                onChange={(e) => updateItem(i, "label", e.target.value)}
                placeholder="Label"
                className="flex-1 bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-1.5 text-xs font-medium text-gray-900 dark:text-[#F9FAFB] placeholder:text-gray-400 dark:placeholder:text-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
              />
              {items.length > 1 && (
                <button onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <input
              value={item.value}
              onChange={(e) => updateItem(i, "value", e.target.value)}
              placeholder="Enter value..."
              className="w-full bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-[#F9FAFB] placeholder:text-gray-400 dark:placeholder:text-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
            />
          </div>
        ))}
        <button
          onClick={addItem}
          className="flex items-center gap-1.5 text-xs font-medium text-[#F59E0B] hover:text-[#D97706] px-3 py-2 rounded-lg hover:bg-[#F59E0B]/10 transition-colors w-full justify-center"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Field
        </button>
      </div>
    </CollapsibleSection>
  )
}
