"use client"

import { usePostEditor } from "../post-editor-provider"
import { CollapsibleSection } from "../collapsible-section"
import { FolderTree } from "lucide-react"

export function CategoriesPanel() {
  const { post, setField, categories, subcategories } = usePostEditor()

  const filteredSubs = subcategories.filter(s => s.category_id === post.category_id)

  return (
    <CollapsibleSection title="Categories" icon={<FolderTree className="h-4 w-4" />}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-[#9CA3AF] mb-1.5">Category</label>
          <select
            value={post.category_id}
            onChange={(e) => {
              setField("category_id", e.target.value)
              setField("subcategory_id", "")
            }}
            className="w-full bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
          >
            <option value="">Select category...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {filteredSubs.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-[#9CA3AF] mb-1.5">Subcategory</label>
            <select
              value={post.subcategory_id}
              onChange={(e) => setField("subcategory_id", e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
            >
              <option value="">None</option>
              {filteredSubs.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}
