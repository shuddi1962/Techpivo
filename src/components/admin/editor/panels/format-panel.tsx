"use client"

import { usePostEditor } from "../post-editor-provider"
import { CollapsibleSection } from "../collapsible-section"
import { FileText, Image, Video, Link2, Quote, Music } from "lucide-react"

const formats = [
  { value: "standard", label: "Standard", icon: FileText },
  { value: "gallery", label: "Gallery", icon: Image },
  { value: "video", label: "Video", icon: Video },
  { value: "link", label: "Link", icon: Link2 },
  { value: "quote", label: "Quote", icon: Quote },
  { value: "audio", label: "Audio", icon: Music },
]

export function FormatPanel() {
  const { post, setField } = usePostEditor()

  return (
    <CollapsibleSection title="Format" icon={<FileText className="h-4 w-4" />}>
      <div className="grid grid-cols-3 gap-1.5">
        {formats.map((f) => {
          const Icon = f.icon
          const active = post.post_format === f.value
          return (
            <button
              key={f.value}
              onClick={() => setField("post_format", f.value)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all ${
                active
                  ? "bg-[#F59E0B]/15 text-[#F59E0B] border-2 border-[#F59E0B]/40 shadow-sm"
                  : "text-gray-500 dark:text-[#9CA3AF] hover:text-gray-700 dark:hover:text-[#F9FAFB] hover:bg-gray-50 dark:hover:bg-[#1F2937] border-2 border-transparent"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-[#F59E0B]" : ""}`} />
              {f.label}
            </button>
          )
        })}
      </div>
    </CollapsibleSection>
  )
}
