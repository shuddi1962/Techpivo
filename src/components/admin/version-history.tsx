"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  History, RotateCcw, Eye, User, Clock, Diff,
} from "lucide-react"

interface ArticleVersion {
  id: string
  post_id: string
  title: string
  content: string
  version_number: number
  created_by: string
  created_at: string
  change_summary: string
}

export function VersionHistory({ postId }: { postId: string }) {
  const supabase = createClient()
  const [versions, setVersions] = useState<ArticleVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState<ArticleVersion | null>(null)

  const fetchVersions = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("article_versions")
      .select("*")
      .eq("post_id", postId)
      .order("version_number", { ascending: false })

    setVersions(data || [])
    setLoading(false)
  }, [postId])

  useEffect(() => { fetchVersions() }, [fetchVersions])

  const restoreVersion = async (version: ArticleVersion) => {
    await supabase
      .from("posts")
      .update({ content: version.content, title: version.title })
      .eq("id", postId)
    fetchVersions()
  }

  return (
    <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
      <div className="flex items-center gap-2.5 mb-6">
        <History className="h-5 w-5 text-[#F59E0B]" />
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Version History</h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">({versions.length} versions)</span>
      </div>

      {loading ? (
        <div className="h-32 flex items-center justify-center text-sm text-gray-400">Loading...</div>
      ) : versions.length === 0 ? (
        <div className="h-32 flex flex-col items-center justify-center text-sm text-gray-400">
          <History className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
          <p>No version history yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {versions.map((version, idx) => (
            <div
              key={version.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                selectedVersion?.id === version.id
                  ? "border-[#F59E0B] bg-amber-50 dark:bg-amber-900/10"
                  : "border-gray-200 dark:border-[#374151] hover:bg-gray-50 dark:hover:bg-[#1F2937]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx === 0 ? "bg-[#F59E0B] text-white" : "bg-gray-100 dark:bg-[#1F2937] text-gray-500 dark:text-gray-400"
                }`}>
                  v{version.version_number}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{version.change_summary || "No description"}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2">
                    <User className="h-3 w-3" />
                    {version.created_by?.slice(0, 8) || "Unknown"}
                    <Clock className="h-3 w-3" />
                    {new Date(version.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedVersion(selectedVersion?.id === version.id ? null : version)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#374151] rounded-lg"
                >
                  <Eye className="h-4 w-4 text-gray-400" />
                </button>
                {idx > 0 && (
                  <button
                    onClick={() => restoreVersion(version)}
                    className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    title="Restore this version"
                  >
                    <RotateCcw className="h-4 w-4 text-blue-400" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedVersion && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-[#374151]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Version {selectedVersion.version_number} Preview</h3>
            <button onClick={() => setSelectedVersion(null)} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
          </div>
          <div className="text-xs text-gray-700 dark:text-gray-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
            {selectedVersion.content?.slice(0, 2000) || "No content"}
          </div>
        </div>
      )}
    </div>
  )
}
