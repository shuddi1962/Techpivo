"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { PostActionsDropdown } from "@/components/admin/post-actions-dropdown"
import { Plus, FileText, Search, RefreshCw } from "lucide-react"

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
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const [counts, setCounts] = useState({ total: 0, published: 0, drafts: 0, views: 0 })

  const fetchPosts = useCallback(async () => {
    const supabase = createClient()

    const [countRes, pubRes, draftRes, viewsRes, dataRes] = await Promise.all([
      supabase.from("posts").select("*", { count: "exact", head: true }),
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("posts").select("views"),
      supabase.from("posts")
        .select("*, category:categories(name)")
        .order("created_at", { ascending: false })
        .limit(200),
    ])

    const totalViews = (viewsRes.data || []).reduce((sum: number, p: any) => sum + (p.views || 0), 0)
    setCounts({
      total: countRes.count || 0,
      published: pubRes.count || 0,
      drafts: draftRes.count || 0,
      views: totalViews,
    })
    if (dataRes.data) setPosts(dataRes.data as unknown as PostRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPosts()
    const interval = setInterval(fetchPosts, 3000)
    const supabase = createClient()
    const channel = supabase
      .channel("posts-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts" }, (payload: any) => {
        if (payload.new?.views !== payload.old?.views) fetchPosts()
      })
      .subscribe()
    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [fetchPosts])

  const filtered = posts.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!p.title.toLowerCase().includes(q)) return false
    }
    return true
  })

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
          <button onClick={fetchPosts} className="p-2 text-gray-400 hover:text-[#6366F1] hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link href="/admin/posts/new">
            <Button className="bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-sm shadow-[#6366F1]/20 font-medium px-5">
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Posts", value: counts.total, color: "text-[#6366F1]", bg: "bg-[#6366F1]/10" },
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="pl-9 pr-4 py-2 text-sm border-2 border-gray-200 dark:border-[#374151] rounded-lg bg-gray-50 dark:bg-[#0A0F1E] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border-2 border-gray-200 dark:border-[#374151] rounded-lg bg-gray-50 dark:bg-[#0A0F1E] text-gray-700 dark:text-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
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
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Views</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Date</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading posts...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <FileText className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {search || statusFilter !== "all" ? "No posts match your filter" : "No posts yet"}
                    </p>
                    {!search && statusFilter === "all" && (
                      <Link href="/admin/posts/new">
                        <Button className="mt-3 bg-[#6366F1] hover:bg-[#4F46E5] text-white">
                          <Plus className="h-4 w-4 mr-2" />
                          Create your first post
                        </Button>
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((post, i) => (
                  <tr key={post.id} className={`border-b border-gray-50 dark:border-[#1F2937]/50 hover:bg-gray-50 dark:hover:bg-[#1a2235] transition-colors ${i === 0 ? "" : ""}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {post.featured_image ? (
                          <img src={post.featured_image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 hidden sm:block border-2 border-gray-200 dark:border-[#374151]" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#1F2937] flex items-center justify-center shrink-0 hidden sm:block border-2 border-gray-200 dark:border-[#374151]">
                            <FileText className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link
                            href={`/admin/posts/${post.id}/edit`}
                            className="text-sm font-semibold text-gray-900 dark:text-white hover:text-[#6366F1] dark:hover:text-[#818CF8] transition-colors line-clamp-1 block"
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
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{post.views || 0}</span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {post.published_at ? formatDate(post.published_at) : formatDate(post.created_at)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <PostActionsDropdown postId={post.id} slug={post.slug} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
