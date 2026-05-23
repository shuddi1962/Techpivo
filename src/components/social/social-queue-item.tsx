"use client"

import {
  X, Globe, Camera, Link, Image, Send,
  MessageCircle, Hash, Code2, BookOpen, Video, ShoppingBag,
  MapPin, RefreshCw, List, Share2,
} from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { SocialPlatform, SocialPostStatus } from "@/types/database"

interface SocialQueueItemProps {
  item: {
    postTitle: string
    platform: SocialPlatform
    scheduledAt: string | null
    status: SocialPostStatus
    errorMessage?: string | null
  }
  onRetry?: () => void
  onCancel?: () => void
}

const platformIcon: Record<SocialPlatform, React.ReactNode> = {
  twitter: <X className="h-4 w-4" />,
  facebook: <Globe className="h-4 w-4" />,
  instagram: <Camera className="h-4 w-4" />,
  linkedin: <Link className="h-4 w-4" />,
  pinterest: <Image className="h-4 w-4" />,
  telegram: <Send className="h-4 w-4" />,
  whatsapp: <MessageCircle className="h-4 w-4" />,
  reddit: <MessageCircle className="h-4 w-4" />,
  medium: <BookOpen className="h-4 w-4" />,
  devto: <Code2 className="h-4 w-4" />,
  hashnode: <Hash className="h-4 w-4" />,
  youtube_community: <Video className="h-4 w-4" />,
  gmb: <ShoppingBag className="h-4 w-4" />,
  buffer: <RefreshCw className="h-4 w-4" />,
  hootsuite: <List className="h-4 w-4" />,
}

const statusConfig: Record<
  SocialPostStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "amber" | "indigo" }
> = {
  pending: { label: "Pending", variant: "secondary" },
  scheduled: { label: "Scheduled", variant: "amber" },
  sent: { label: "Sent", variant: "indigo" },
  failed: { label: "Failed", variant: "destructive" },
  skipped: { label: "Skipped", variant: "outline" },
}

export function SocialQueueItem({ item, onRetry, onCancel }: SocialQueueItemProps) {
  const status = statusConfig[item.status]
  const icon = platformIcon[item.platform]

  return (
    <Card className={cn(item.status === "failed" && "border-destructive/50")}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.postTitle}</p>
          <p className="text-xs text-muted-foreground">
            {item.scheduledAt
              ? format(new Date(item.scheduledAt), "MMM d, yyyy h:mm a")
              : "Not scheduled"}
          </p>
          {item.errorMessage && (
            <p className="mt-0.5 truncate text-xs text-destructive">{item.errorMessage}</p>
          )}
        </div>

        <Badge variant={status.variant} className="shrink-0">
          {status.label}
        </Badge>

        {(item.status === "pending" || item.status === "scheduled") && onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}

        {item.status === "failed" && onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
