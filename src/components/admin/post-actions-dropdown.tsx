"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Eye, Settings, Trash2, ExternalLink, Loader2 } from "lucide-react"

interface PostActionsDropdownProps {
  postId: string
  slug: string
}

export function PostActionsDropdown({ postId, slug }: PostActionsDropdownProps) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post? This cannot be undone.")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" })
      if (res.ok) {
        router.refresh()
      } else {
        alert("Failed to delete post.")
      }
    } catch {
      alert("Error deleting post.")
    }
    setDeleting(false)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg transition-colors"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl shadow-2xl overflow-hidden">
          <div className="py-1">
            <a
              href={`/admin/posts/${postId}/edit`}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-[#D1D5DB] hover:bg-gray-50 dark:hover:bg-[#1F2937] transition-colors"
            >
              <Settings className="h-4 w-4 text-gray-400" />
              Edit
            </a>
            <a
              href={`/${slug}`}
              target="_blank"
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-[#D1D5DB] hover:bg-gray-50 dark:hover:bg-[#1F2937] transition-colors"
            >
              <Eye className="h-4 w-4 text-gray-400" />
              View
              <ExternalLink className="h-3 w-3 text-gray-400 ml-auto" />
            </a>
            <div className="border-t border-gray-100 dark:border-[#1F2937]" />
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
