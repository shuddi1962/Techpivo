"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Workflow, Clock, CheckCircle, AlertCircle, 
  RefreshCw, ArrowRight, FileText, Eye 
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
  const [tasks, setTasks] = useState<PublishTask[]>([])
  const [loading, setLoading] = useState(true)
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
    return () => clearInterval(interval)
  }, [])

  const loadTasks = async () => {
    const supabase = createClient()
    
    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, title, status, updated_at, profiles!posts_author_id_fkey(full_name)")
      .in("status", ["draft", "scheduled"])
      .order("updated_at", { ascending: false })
      .limit(10)

    if (error) {
      console.error("Error loading tasks:", error)
      setLoading(false)
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
          <Button variant="ghost" size="sm" onClick={loadTasks}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="text-center p-2 rounded-lg bg-gray-50">
            <p className="text-lg font-bold text-gray-600">{stats.drafts}</p>
            <p className="text-xs text-muted-foreground">Drafts</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-yellow-50">
            <p className="text-lg font-bold text-yellow-600">{stats.review}</p>
            <p className="text-xs text-muted-foreground">In Review</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-purple-50">
            <p className="text-lg font-bold text-purple-600">{stats.scheduled}</p>
            <p className="text-xs text-muted-foreground">Scheduled</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-blue-50">
            <p className="text-lg font-bold text-blue-600">{stats.publishing}</p>
            <p className="text-xs text-muted-foreground">Publishing</p>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No pending tasks</p>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                {getStatusIcon(task.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.author} • {getTimeAgo(task.updatedAt)}
                  </p>
                </div>
                {getStatusBadge(task.status)}
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
