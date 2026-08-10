"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Check, X, MessageSquare, Search, Trash2, Eye, RefreshCw, AlertCircle } from "lucide-react"

const tabs = [
  { id: "all", label: "All", icon: MessageSquare },
  { id: "pending", label: "Pending", icon: Eye },
  { id: "approved", label: "Approved", icon: Check },
  { id: "spam", label: "Spam", icon: X },
]

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const supabase = createClient()

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    let q = supabase.from("comments").select("*, posts:post_id(title)").order("created_at", { ascending: false }).limit(200)
    if (activeTab !== "all") q = q.eq("status", activeTab)
    const { data, error } = await q
    if (error) {
      console.error("Failed to load comments:", error)
      if (!quiet) setError(error.message)
    } else {
      setComments((data as any[]) || [])
      setError("")
      setLastSync(new Date())
    }
    if (!quiet) setLoading(false)
  }, [supabase, activeTab])

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`admin_comments_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => load(true))
      .subscribe()
    const interval = setInterval(() => load(true), 30000)
    const onFocus = () => load(true)
    window.addEventListener("focus", onFocus)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [supabase, load])

  const filtered = comments.filter(c => {
    if (search) {
      const q = search.toLowerCase()
      if (!c.content?.toLowerCase().includes(q) && !c.author_name?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const counts = {
    all: comments.length,
    pending: comments.filter(c => c.status === "pending").length,
    approved: comments.filter(c => c.status === "approved").length,
    spam: comments.filter(c => c.status === "spam").length,
  }

  const updateStatus = async (id: string, status: string) => {
    setError("")
    const { error } = await supabase.from("comments").update({ status }).eq("id", id)
    if (error) {
      console.error("Failed to update comment:", error)
      setError(error.message)
      return
    }
    setComments(comments.map((c) => c.id === id ? { ...c, status } : c))
  }

  const deleteComment = async (id: string) => {
    setError("")
    const { error } = await supabase.from("comments").delete().eq("id", id)
    if (error) {
      console.error("Failed to delete comment:", error)
      setError(error.message)
      return
    }
    setComments(comments.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Comments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {comments.length} loaded · {lastSync ? `synced ${lastSync.toLocaleTimeString()}` : "…"}
          </p>
        </div>
        <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> LIVE
        </span>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <div className="flex flex-wrap gap-1 border-b pb-px">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tab.id ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
              <Icon className="h-3.5 w-3.5" /> {tab.label}
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-muted">{counts[tab.id as keyof typeof counts]}</span>
            </button>
          )
        })}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search comments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      <div className="space-y-2">
        {loading && comments.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" /> Loading comments...
          </div>
        ) : filtered.map((comment) => (
          <Card key={comment.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium">{comment.author_name}</span>
                    <span className="text-xs text-muted-foreground">{comment.author_email}</span>
                    <Badge variant={comment.status === "approved" ? "default" : comment.status === "pending" ? "secondary" : "destructive"}>
                      {comment.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{comment.content}</p>
                  {comment.posts && <p className="text-xs text-muted-foreground mt-1">On: {comment.posts.title}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  {comment.status !== "approved" && (
                    <Button variant="ghost" size="icon" onClick={() => updateStatus(comment.id, "approved")} title="Approve">
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                  )}
                  {comment.status === "approved" && (
                    <Button variant="ghost" size="icon" onClick={() => updateStatus(comment.id, "pending")} title="Unapprove">
                      <Eye className="h-4 w-4 text-yellow-500" />
                    </Button>
                  )}
                  {comment.status !== "spam" && (
                    <Button variant="ghost" size="icon" onClick={() => updateStatus(comment.id, "spam")} title="Mark Spam">
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => deleteComment(comment.id)} title="Delete">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No comments found</p>}
      </div>
    </div>
  )
}
