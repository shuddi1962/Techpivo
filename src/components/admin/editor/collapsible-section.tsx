"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"

interface CollapsibleSectionProps {
  title: string
  icon?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

export function CollapsibleSection({ title, icon, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-[#1F2937] rounded-lg overflow-hidden bg-[#111827]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[#F9FAFB] hover:bg-[#1a2235] transition-colors"
      >
        <span className="flex items-center gap-2">
          {icon && <span className="text-[#6366F1]">{icon}</span>}
          {title}
        </span>
        <ChevronDown className={`h-4 w-4 text-[#9CA3AF] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}
