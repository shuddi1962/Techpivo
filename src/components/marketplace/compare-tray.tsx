// TechPivo Market compare tray (CLIENT) — fixed bottom bar that appears
// wherever compare toggles exist, giving the compare button a destination:
// review the shortlist, jump to the side-by-side page, or clear it.

"use client"

import Link from "next/link"
import { ArrowLeftRight, X } from "lucide-react"
import { clearCompare, useCompareIds } from "@/lib/marketplace-compare"

export function CompareTray() {
  const ids = useCompareIds()
  if (ids.length === 0) return null
  return (
    <div className="fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4" role="status" aria-live="polite">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl bg-[#0B0F19]/95 py-2.5 pl-4 pr-2.5 text-white shadow-[0_16px_50px_rgba(11,15,25,0.45)] backdrop-blur-sm animate-[slideUp_0.3s_cubic-bezier(0.22,1,0.36,1)]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
          <ArrowLeftRight className="h-4 w-4" />
        </span>
        <p className="min-w-0 flex-1 text-[13px] font-semibold">
          Compare list
          <span className="block text-[11px] font-medium text-white/60">
            {ids.length} item{ids.length === 1 ? "" : "s"} shortlisted
          </span>
        </p>
        <button
          type="button"
          onClick={clearCompare}
          aria-label="Clear compare list"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
        <Link
          href="/marketplace/compare"
          className="shrink-0 rounded-xl bg-[#F59E0B] px-4 py-2.5 text-[13px] font-bold text-[#0F172A] transition-colors hover:bg-[#D97706]"
        >
          Compare now
        </Link>
      </div>
    </div>
  )
}
