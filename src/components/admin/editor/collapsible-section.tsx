"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"

interface CollapsibleSectionProps {
  title: string
  icon?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}

export function CollapsibleSection({ title, icon, defaultOpen = true, children, className = "" }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`bg-white dark:bg-[#111827] border-2 border-gray-300 dark:border-[#374151] rounded-xl shadow-sm ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-gray-700 dark:text-[#F9FAFB] hover:bg-gray-50 dark:hover:bg-[#1a2235] transition-colors"
      >
        <span className="flex items-center gap-2.5">
          {icon && <span className="text-[#F59E0B]">{icon}</span>}
          {title}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 dark:text-[#6B7280] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}
