"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { PostActionsDropdown } from "@/components/admin/post-actions-dropdown"
import { SafeImage } from "@/components/ui/safe-image"
import { Plus, FileText, Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"

const PAGE_SIZE = 20

interface PostRow {
  id: string
  title: string
  slug: string
  excerpt: string | null
  featured_image: string | null
  status: string
  views: number
  created_at: string
  published_at: string | null
  category: { name: string } | null
  ai_rewritten: boolean
  model_used: string | null
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [aiFilter, setAiFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [counts, setCounts] = useState({ total: 0, published: 0, drafts: 0, views: 0 })
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()

  const buildQuery = useCallback((client: ReturnType<typeof createClient>, pageNum: number) => {
    let q = client
      .from("posts")
      .select("*, category:categories(name)", { count: "exact" })

    if (statusFilter !== "all") q = q.eq("status", statusFilter)
    if (aiFilter === "ai") q = q.eq("ai_rewritten", true)
    if (aiFilter === "manual") q = q.eq("ai_rewritten", false)
    if (search) q = q.ilike("title", `%${search}%`)

    const from = (pageNum - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    return q
      .order("created_at", { ascending: false })
      .range(from, to)
  }, [search, statusFilter, aiFilter])

  const fetchPage = useCallback(async (pageNum: number) => {
    const supabase = createClient()
    const res = await buildQuery(supabase, pageNum)
    if (res.data) setPosts(res.data as unknown as PostRow[])
    if (typeof res.count === "number") setTotalCount(res.count)
    setLoading(false)
  }, [buildQuery])

  const fetchCounts = useCallback(async () => {
    const supabase = createClient()
    const [countRes, pubRes, draftRes, viewsRes] = await Promise.all([
      supabase.from("posts").select("*", { count: "exact", head: true }),
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("posts").select("views"),
    ])
    const totalViews = (viewsRes.data || []).reduce((sum: number, p: any) => sum + (p.views || 0), 0)
    setCounts({
      total: countRes.count || 0,
      published: pubRes.count || 0,
      drafts: draftRes.count || 0,
      views: totalViews,
    })
  }, [])

  const refresh = useCallback(() => {
    setLoading(true)
    fetchCounts()
    fetchPage(page)
  }, [fetchCounts, fetchPage, page])

  useEffect(() => {
    fetchCounts()
    fetchPage(1)
    setPage(1)
  }, [search, statusFilter, aiFilter])

  useEffect(() => {
    fetchPage(page)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("posts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        fetchCounts()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Posts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your blog content</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="p-2 text-gray-400 hover:text-[#F59E0B] hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link href="/admin/posts/new">
            <Button className="bg-[#F59E0B] hover:bg-[#D97706] text-white shadow-sm shadow-[#F59E0B]/20 font-medium px-5">
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Posts", value: counts.total, color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
          { label: "Published", value: counts.published, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
          { label: "Drafts", value: counts.drafts, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
          { label: "Total Views", value: counts.views.toLocaleString(), color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <FileText className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-gray-100 dark:border-[#1F2937]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                if (searchTimeout.current) clearTimeout(searchTimeout.current)
                searchTimeout.current = setTimeout(() => setSearch(e.target.value), 300)
              }}
              placeholder="Search posts..."
              className="pl-9 pr-4 py-2 text-sm border-2 border-gray-200 dark:border-[#374151] rounded-lg bg-gray-50 dark:bg-[#0A0F1E] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent w-64"
            />
          </div>
          <select
            value={aiFilter}
            onChange={(e) => setAiFilter(e.target.value)}
            className="text-sm border-2 border-gray-200 dark:border-[#374151] rounded-lg bg-gray-50 dark:bg-[#0A0F1E] text-gray-700 dark:text-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
          >
            <option value="all">All Posts</option>
            <option value="ai">AI Rewritten</option>
            <option value="manual">Manual Only</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border-2 border-gray-200 dark:border-[#374151] rounded-lg bg-gray-50 dark:bg-[#0A0F1E] text-gray-700 dark:text-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-100 dark:border-[#1F2937]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Category</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Source</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Views</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Date</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading posts...
                    </div>
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <FileText className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {search || statusFilter !== "all" ? "No posts match your filter" : "No posts yet"}
                    </p>
                    {!search && statusFilter === "all" && (
                      <Link href="/admin/posts/new">
                        <Button className="mt-3 bg-[#F59E0B] hover:bg-[#D97706] text-white">
                          <Plus className="h-4 w-4 mr-2" />
                          Create your first post
                        </Button>
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                posts.map((post, i) => (
                  <tr key={post.id} className={`border-b border-gray-50 dark:border-[#1F2937]/50 hover:bg-gray-50 dark:hover:bg-[#1a2235] transition-colors ${i === 0 ? "" : ""}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {post.featured_image ? (
                          <SafeImage src={post.featured_image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 hidden sm:block" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#1F2937] flex items-center justify-center shrink-0 hidden sm:block border-2 border-gray-200 dark:border-[#374151]">
                            <FileText className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link
                            href={`/admin/posts/${post.id}/edit`}
                            className="text-sm font-semibold text-gray-900 dark:text-white hover:text-[#F59E0B] dark:hover:text-[#818CF8] transition-colors line-clamp-1 block"
                          >
                            {post.title}
                          </Link>
                          {post.excerpt && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1 mt-0.5">{post.excerpt.replace(/<[^>]*>/g, "").slice(0, 100)}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{post.category?.name || "—"}</span>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        post.status === "published" ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 ring-1 ring-green-600/20" :
                        post.status === "draft" ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-600/20" :
                        post.status === "scheduled" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 ring-1 ring-indigo-600/20" :
                        "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400 ring-1 ring-gray-600/20"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          post.status === "published" ? "bg-green-500" :
                          post.status === "draft" ? "bg-amber-500" :
                          post.status === "scheduled" ? "bg-indigo-500" :
                          "bg-gray-400"
                        }`} />
                        {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      {post.ai_rewritten ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 ring-1 ring-violet-600/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                          {post.model_used === 'gemini-grounded' ? 'Gemini' : 'AI'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-1 ring-blue-600/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{post.views || 0}</span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {post.published_at ? formatDate(post.published_at) : formatDate(post.created_at)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <PostActionsDropdown postId={post.id} slug={post.slug} title={post.title} excerpt={post.excerpt || undefined} featured_image={post.featured_image || undefined} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t-2 border-gray-100 dark:border-[#1F2937]">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages} ({totalCount} posts)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-gray-400 hover:text-[#F59E0B] hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 7) {
                  pageNum = i + 1
                } else if (page <= 4) {
                  pageNum = i + 1
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i
                } else {
                  pageNum = page - 3 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`min-w-[32px] h-8 text-xs font-medium rounded-lg transition-colors ${
                      page === pageNum
                        ? "bg-[#F59E0B] text-white"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1F2937]"
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-gray-400 hover:text-[#F59E0B] hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
