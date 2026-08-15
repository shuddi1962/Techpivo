"use client"

import { useRouter } from "next/navigation"
import { Bell, AlertTriangle, CheckCircle, Info, RefreshCw, X, CheckCheck, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAdminNotifications } from "@/lib/use-admin-notifications"

const TYPE_META = {
  critical: { icon: AlertTriangle, cls: "text-red-600", tile: "bg-red-50 text-red-700 ring-red-600/20" },
  warning: { icon: AlertTriangle, cls: "text-yellow-600", tile: "bg-yellow-50 text-yellow-700 ring-yellow-600/20" },
  success: { icon: CheckCircle, cls: "text-green-600", tile: "bg-green-50 text-green-700 ring-green-600/20" },
  info: { icon: Info, cls: "text-blue-600", tile: "bg-blue-50 text-blue-700 ring-blue-600/20" },
} as const

export function NotificationCenter() {
  const router = useRouter()
  const { notifications, unreadCount, loading, refresh, markRead, markAllRead } = useAdminNotifications()

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
                  {unreadCount}
                </span>
              )}
            </span>
            Notifications
          </CardTitle>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead} title="Mark all as read" className="text-xs gap-1">
                <CheckCheck className="h-3.5 w-3.5" /> Read all
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => refresh()}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle className="h-8 w-8 text-green-500/50 mb-2" />
              <p className="text-sm text-muted-foreground">All caught up</p>
              <p className="text-xs text-muted-foreground mt-1">New alerts appear here live as things happen</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const meta = TYPE_META[notif.type]
              const Icon = meta.icon
              return (
                <div
                  key={notif.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    markRead(notif.id)
                    if (notif.href) router.push(notif.href)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && notif.href) {
                      markRead(notif.id)
                      router.push(notif.href)
                    }
                  }}
                  className={`group flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer hover:bg-muted/50 ${notif.read ? "opacity-70" : ""}`}
                >
                  <div className="mt-0.5">
                    <Icon className={`h-4.5 w-4.5 ${meta.cls}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-sm font-medium truncate">{notif.title}</h4>
                      <Badge variant="secondary" className={`shrink-0 text-[10px] ${meta.tile}`}>
                        {notif.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{notif.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground/70 tabular-nums">
                        {new Date(notif.timestamp).toLocaleTimeString()}
                      </span>
                      {notif.href && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Go to page <ExternalLink className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0 opacity-60 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      markRead(notif.id)
                    }}
                    title="Dismiss"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
