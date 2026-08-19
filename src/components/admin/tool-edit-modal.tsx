"use client"

import { useState } from "react"
import { X, Save, Loader2, CheckCircle2 } from "lucide-react"
import { TOOL_CATEGORY_LABEL, ToolCategory } from "@/lib/tools-metadata"

export interface EditableTool {
  slug: string
  name: string
  description: string
  category: string
  icon: string
  is_ai_tool: boolean
  meta_title: string
  meta_description: string
  api_endpoint: string
}

const CATEGORY_VALUES: ToolCategory[] = ["developer", "security", "network", "seo", "image", "pdf", "calculator", "ai"]

export default function ToolEditModal({
  tool,
  onClose,
  onSaved,
}: {
  tool: EditableTool
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(tool.name)
  const [description, setDescription] = useState(tool.description)
  const [category, setCategory] = useState(tool.category)
  const [icon, setIcon] = useState(tool.icon)
  const [isAi, setIsAi] = useState(tool.is_ai_tool)
  const [metaTitle, setMetaTitle] = useState(tool.meta_title)
  const [metaDesc, setMetaDesc] = useState(tool.meta_description)
  const [apiEndpoint, setApiEndpoint] = useState(tool.api_endpoint)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setBusy(true)
    setError("")
    setSaved(false)
    try {
      const res = await fetch("/api/admin/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          slug: tool.slug,
          name,
          description,
          category,
          icon,
          is_ai_tool: isAi,
          meta_title: metaTitle,
          meta_description: metaDesc,
          api_endpoint: apiEndpoint,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Save failed")
        return
      }
      setSaved(true)
      setTimeout(() => onSaved(), 350)
    } catch (e: any) {
      setError(e?.message || "Network error")
    } finally {
      setBusy(false)
    }
  }

  const field = "w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent outline-none"
  const label = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5"

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 sm:pt-20"
      style={{ background: "rgba(15,23,42,.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#374151] rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#1F2937]">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Edit tool</h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5">/tools/{tool.slug}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1F2937]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-900">{error}</div>
          )}
          <div>
            <label className={label}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={field} maxLength={120} placeholder="Tool name" />
          </div>
          <div>
            <label className={label}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={field} rows={3} maxLength={500} placeholder="Short description shown on cards" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
                {CATEGORY_VALUES.map((c) => (
                  <option key={c} value={c}>{TOOL_CATEGORY_LABEL[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Icon name (lucide)</label>
              <input value={icon} onChange={(e) => setIcon(e.target.value)} className={field} maxLength={60} placeholder="e.g. Braces" />
            </div>
          </div>
          <div>
            <label className={label}>Meta title (optional, overrides registry on the public page)</label>
            <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className={field} maxLength={160} placeholder="SEO title" />
          </div>
          <div>
            <label className={label}>Meta description (optional)</label>
            <input value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} className={field} maxLength={320} placeholder="SEO description" />
          </div>
          <div>
            <label className={label}>API endpoint (optional)</label>
            <input value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)} className={field} maxLength={500} placeholder="/api/tools/…" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={isAi} onChange={(e) => setIsAi(e.target.checked)} className="h-4 w-4 rounded" />
            Mark as AI tool (shows the AI badge)
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-[#1F2937]">
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 mr-auto">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved — updating live
            </span>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-[#374151] text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1F2937]"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#F59E0B] text-white hover:bg-[#D97706] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  )
}