"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Bell, AlertTriangle, CheckCircle, Info, 
  RefreshCw, X, Settings, Clock
} from "lucide-react"

interface Notification {
  id: string
  type: "critical" | "warning" | "info" | "success"
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    const supabase = createClient()
    
    const notifs: Notification[] = []

    // Check for SEO issues
    const { data: seoIssues } = await supabase
      .from("seo_issues")
      .select("id, issue_type, severity, description")
      .eq("resolved", false)
      .limit(5)

    if (seoIssues && seoIssues.length > 0) {
      notifs.push({
        id: "seo-issues",
        type: "warning",
        title: "SEO Issues Detected",
        message: `${seoIssues.length} unresolved SEO issues need attention`,
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: "/admin/seo"
      })
    }

    // Check for failed indexing
    const { data: failedIndexing } = await supabase
      .from("google_indexing_queue")
      .select("id")
      .eq("status", "failed")
      .limit(1)

    if (failedIndexing && failedIndexing.length > 0) {
      notifs.push({
        id: "indexing-failed",
        type: "critical",
        title: "Indexing Failures",
        message: "Some URLs failed to index. Check the indexing queue.",
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: "/admin/indexing"
      })
    }

    // Check for pending comments
    const { data: pendingComments } = await supabase
      .from("comments")
      .select("id")
      .eq("status", "pending")
      .limit(1)

    if (pendingComments && pendingComments.length > 0) {
      notifs.push({
        id: "pending-comments",
        type: "info",
        title: "Pending Comments",
        message: "New comments awaiting moderation",
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: "/admin/comments"
      })
    }

    // Check recent publications
    const { data: recentPosts } = await supabase
      .from("posts")
      .select("id, title")
      .eq("status", "published")
      .gte("published_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(3)

    if (recentPosts && recentPosts.length > 0) {
      notifs.push({
        id: "recent-publications",
        type: "success",
        title: "Recent Publications",
        message: `${recentPosts.length} articles published in the last 24 hours`,
        timestamp: new Date().toISOString(),
        read: false
      })
    }

    setNotifications(notifs)
    setUnreadCount(notifs.filter(n => !n.read).length)
    setLoading(false)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "critical": return <AlertTriangle className="h-4 w-4 text-red-600" />
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "success": return <CheckCircle className="h-4 w-4 text-green-600" />
      default: return <Info className="h-4 w-4 text-blue-600" />
    }
  }

  const getBadge = (type: string) => {
    switch (type) {
      case "critical": return <Badge variant="destructive">Critical</Badge>
      case "warning": return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
      case "success": return <Badge className="bg-green-100 text-green-800">Success</Badge>
      default: return <Badge className="bg-blue-100 text-blue-800">Info</Badge>
    }
  }

  const dismissNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id))
    setUnreadCount(prev => Math.max(0, prev - 1))
    const dismissed = JSON.parse(localStorage.getItem('dismissed-notifications') || '[]')
    dismissed.push(id)
    localStorage.setItem('dismissed-notifications', JSON.stringify(dismissed))
  }

  useEffect(() => {
    const dismissed = JSON.parse(localStorage.getItem('dismissed-notifications') || '[]')
    if (dismissed.length > 0) {
      setNotifications(prev => prev.filter(n => !dismissed.includes(n.id)))
      setUnreadCount(prev => Math.max(0, notifications.filter(n => !dismissed.includes(n.id) && !n.read).length))
    }
  }, [notifications.length])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
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
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>
            )}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={loadNotifications}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No notifications</p>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.id} 
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                {getIcon(notif.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium">{notif.title}</h4>
                    {getBadge(notif.type)}
                  </div>
                  <p className="text-xs text-muted-foreground">{notif.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(notif.timestamp).toLocaleTimeString()}
                    </span>
                    {notif.actionUrl && (
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                        <a href={notif.actionUrl}>View</a>
                      </Button>
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => dismissNotification(notif.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
