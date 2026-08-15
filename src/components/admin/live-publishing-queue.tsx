"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Workflow, Clock, CheckCircle, AlertCircle, 
  RefreshCw, ArrowRight, FileText, Eye, ExternalLink
} from "lucide-react"

interface PublishTask {
  id: string
  title: string
  status: "draft" | "review" | "seo" | "scheduled" | "publishing" | "published" | "failed"
  author: string
  updatedAt: string
  priority: "high" | "medium" | "low"
}

export function LivePublishingQueue() {
  const supabaseRef = useRef(createClient())
  const [tasks, setTasks] = useState<PublishTask[]>([])
  const [loading, setLoading] = useState(true)
  const busyRef = useRef(false)
  const [stats, setStats] = useState({
    drafts: 0,
    review: 0,
    scheduled: 0,
    publishing: 0
  })

  useEffect(() => {
    loadTasks()
    // Refresh every 30 seconds
    const interval = setInterval(loadTasks, 30000)

    const client = supabaseRef.current
    const channel = client
      .channel(`publish_queue_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => loadTasks())
      .subscribe()

    const onFocus = () => loadTasks()
    window.addEventListener("focus", onFocus)

    return () => {
      clearInterval(interval)
      client.removeChannel(channel)
      window.removeEventListener("focus", onFocus)
    }
  }, [])

  const loadTasks = async () => {
    if (busyRef.current) return
    busyRef.current = true
    const supabase = supabaseRef.current
    
    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, title, status, updated_at, profiles!posts_author_id_fkey(full_name)")
      .in("status", ["draft", "scheduled"])
      .order("updated_at", { ascending: false })
      .limit(10)

    if (error) {
      console.error("Error loading tasks:", error)
      setLoading(false)
      busyRef.current = false
      return
    }

    const publishTasks: PublishTask[] = (posts || []).map(post => ({
      id: post.id,
      title: post.title,
      status: post.status === "scheduled" ? "scheduled" : "draft",
      author: (post.profiles as any)?.full_name || "Unknown",
      updatedAt: post.updated_at,
      priority: "medium"
    }))

    setTasks(publishTasks)

    // Calculate stats
    const { data: allPosts } = await supabase
      .from("posts")
      .select("status")

    if (allPosts) {
      setStats({
        drafts: allPosts.filter(p => p.status === "draft").length,
        review: 0,
        scheduled: allPosts.filter(p => p.status === "scheduled").length,
        publishing: 0
      })
    }

    setLoading(false)
    busyRef.current = false
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft": return <FileText className="h-4 w-4 text-gray-500" />
      case "review": return <Eye className="h-4 w-4 text-yellow-500" />
      case "seo": return <CheckCircle className="h-4 w-4 text-blue-500" />
      case "scheduled": return <Clock className="h-4 w-4 text-purple-500" />
      case "publishing": return <RefreshCw className="h-4 w-4 text-orange-500 animate-spin" />
      case "published": return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed": return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft": return <Badge variant="secondary">Draft</Badge>
      case "review": return <Badge className="bg-yellow-100 text-yellow-800">In Review</Badge>
      case "seo": return <Badge className="bg-blue-100 text-blue-800">SEO Check</Badge>
      case "scheduled": return <Badge className="bg-purple-100 text-purple-800">Scheduled</Badge>
      case "publishing": return <Badge className="bg-orange-100 text-orange-800">Publishing</Badge>
      case "published": return <Badge className="bg-green-100 text-green-800">Published</Badge>
      case "failed": return <Badge variant="destructive">Failed</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Live Publishing Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Live Publishing Queue
          </CardTitle>
          <div className="flex items-center gap-1">
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground mr-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/posts">
                <span className="text-xs">All posts</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={loadTasks}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <Link href="/admin/posts" className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group">
            <p className="text-lg font-bold text-gray-600 dark:text-gray-300 group-hover:text-primary transition-colors">{stats.drafts}</p>
            <p className="text-xs text-muted-foreground">Drafts</p>
          </Link>
          <Link href="/admin/posts" className="text-center p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors group">
            <p className="text-lg font-bold text-yellow-600 group-hover:text-primary transition-colors">{stats.review}</p>
            <p className="text-xs text-muted-foreground">In Review</p>
          </Link>
          <Link href="/admin/posts" className="text-center p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors group">
            <p className="text-lg font-bold text-purple-600 group-hover:text-primary transition-colors">{stats.scheduled}</p>
            <p className="text-xs text-muted-foreground">Scheduled</p>
          </Link>
          <Link href="/admin/posts" className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group">
            <p className="text-lg font-bold text-blue-600 group-hover:text-primary transition-colors">{stats.publishing}</p>
            <p className="text-xs text-muted-foreground">Publishing</p>
          </Link>
        </div>

        {/* Task List */}
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No pending tasks</p>
          ) : (
            tasks.map((task) => (
              <Link
                key={task.id}
                href={`/admin/posts/${task.id}/edit`}
                className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-colors group"
              >
                {getStatusIcon(task.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.author} • {getTimeAgo(task.updatedAt)}
                  </p>
                </div>
                {getStatusBadge(task.status)}
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
