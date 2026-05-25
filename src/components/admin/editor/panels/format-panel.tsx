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
      <div className="grid grid-cols-3 gap-1">
        {formats.map((f) => {
          const Icon = f.icon
          const active = post.post_format === f.value
          return (
            <button
              key={f.value}
              onClick={() => setField("post_format", f.value)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-colors ${
                active
                  ? "bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/40"
                  : "text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#1F2937] border border-transparent"
              }`}
            >
              <Icon className="h-5 w-5" />
              {f.label}
            </button>
          )
        })}
      </div>
    </CollapsibleSection>
  )
}
