"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  GitBranch, CheckCircle, Clock, XCircle, MessageSquare,
  ChevronDown, ChevronUp, User, AlertCircle,
} from "lucide-react"

interface WorkflowPost {
  id: string
  title: string
  slug: string
  status: string
  author_id: string
  created_at: string
  updated_at: string
  category_id: string
}

interface WorkflowStage {
  name: string
  status: "pending" | "active" | "completed" | "rejected"
  assignee?: string
  completed_at?: string
  comments?: string
}

export function EditorialWorkflow() {
  const supabase = createClient()
  const [posts, setPosts] = useState<WorkflowPost[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState("all")

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from("posts")
      .select("id, title, slug, status, author_id, created_at, updated_at, category_id")
      .in("status", ["draft", "review", "scheduled", "published"])
      .order("updated_at", { ascending: false })
      .limit(50)

    if (filter !== "all") query = query.eq("status", filter)

    const { data } = await query
    setPosts(data || [])
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const getWorkflowStages = (post: WorkflowPost): WorkflowStage[] => {
    const stages: WorkflowStage[] = [
      { name: "Draft", status: "completed" },
      { name: "AI Review", status: "pending" },
      { name: "Editor Review", status: "pending" },
      { name: "SEO Review", status: "pending" },
      { name: "Publish", status: "pending" },
    ]

    if (post.status === "draft") {
      stages[1].status = "active"
    } else if (post.status === "review") {
      stages[1].status = "completed"
      stages[2].status = "active"
    } else if (post.status === "scheduled") {
      stages[1].status = "completed"
      stages[2].status = "completed"
      stages[3].status = "completed"
      stages[4].status = "active"
    } else if (post.status === "published") {
      stages.forEach(s => s.status = "completed")
    }

    return stages
  }

  const statusConfig: Record<string, { color: string; icon: any }> = {
    draft: { color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400", icon: Clock },
    review: { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: AlertCircle },
    scheduled: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Clock },
    published: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle },
  }

  const stageIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-green-500" />
      case "active": return <Clock className="h-4 w-4 text-[#F59E0B] animate-pulse" />
      case "rejected": return <XCircle className="h-4 w-4 text-red-500" />
      default: return <div className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
    }
  }

  return (
    <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <GitBranch className="h-5 w-5 text-[#F59E0B]" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Editorial Workflow</h2>
        </div>
        <div className="flex gap-1">
          {["all", "draft", "review", "scheduled", "published"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${
                filter === f ? "bg-[#F59E0B] text-white" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1F2937]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-sm text-gray-400">
          <GitBranch className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
          <p>No posts in workflow</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map(post => {
            const stages = getWorkflowStages(post)
            const config = statusConfig[post.status] || statusConfig.draft
            const Icon = config.icon
            const isExpanded = expandedId === post.id

            return (
              <div key={post.id} className="border border-gray-200 dark:border-[#374151] rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1F2937]"
                  onClick={() => setExpandedId(isExpanded ? null : post.id)}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{post.title}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        Updated {new Date(post.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${config.color}`}>
                      {post.status}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-gray-100 dark:border-[#374151] pt-3">
                    <div className="flex items-center gap-2">
                      {stages.map((stage, i) => (
                        <div key={stage.name} className="flex items-center gap-2">
                          <div className="flex flex-col items-center">
                            {stageIcon(stage.status)}
                            <span className={`text-[10px] mt-1 ${
                              stage.status === "active" ? "text-[#F59E0B] font-semibold"
                                : stage.status === "completed" ? "text-green-500"
                                  : "text-gray-400 dark:text-gray-500"
                            }`}>
                              {stage.name}
                            </span>
                          </div>
                          {i < stages.length - 1 && (
                            <div className={`w-8 h-0.5 mt-[-12px] ${
                              stage.status === "completed" ? "bg-green-400" : "bg-gray-200 dark:bg-[#374151]"
                            }`} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
