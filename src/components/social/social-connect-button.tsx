"use client"

import type { ReactElement } from "react"
import {
  X, Globe, Camera, Link, Image, Send,
  MessageCircle, Hash, Code2, BookOpen, Video, Store,
  RefreshCw, List, Share2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SocialConnectButtonProps {
  platform: string
  isConnected: boolean
  onConnect: () => void
}

const platformMap: Record<string, { label: string; icon: ReactElement }> = {
  twitter: { label: "Twitter / X", icon: <X className="h-4 w-4" /> },
  facebook: { label: "Facebook", icon: <Globe className="h-4 w-4" /> },
  instagram: { label: "Instagram", icon: <Camera className="h-4 w-4" /> },
  linkedin: { label: "LinkedIn", icon: <Link className="h-4 w-4" /> },
  pinterest: { label: "Pinterest", icon: <Image className="h-4 w-4" /> },
  telegram: { label: "Telegram", icon: <Send className="h-4 w-4" /> },
  whatsapp: { label: "WhatsApp", icon: <MessageCircle className="h-4 w-4" /> },
  reddit: { label: "Reddit", icon: <MessageCircle className="h-4 w-4" /> },
  medium: { label: "Medium", icon: <BookOpen className="h-4 w-4" /> },
  devto: { label: "Dev.to", icon: <Code2 className="h-4 w-4" /> },
  hashnode: { label: "Hashnode", icon: <Hash className="h-4 w-4" /> },
  youtube_community: { label: "YouTube Community", icon: <Video className="h-4 w-4" /> },
  gmb: { label: "Google Business", icon: <Store className="h-4 w-4" /> },
  buffer: { label: "Buffer", icon: <RefreshCw className="h-4 w-4" /> },
  hootsuite: { label: "Hootsuite", icon: <List className="h-4 w-4" /> },
}

const fallback = { label: "Unknown Platform", icon: <Share2 className="h-4 w-4" /> }

export function SocialConnectButton({ platform, isConnected, onConnect }: SocialConnectButtonProps) {
  const config = platformMap[platform] ?? fallback

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-3 transition-colors",
        isConnected && "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-background">
          {config.icon}
        </div>
        <div>
          <p className="text-sm font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">
            {isConnected ? "Connected" : "Not connected"}
          </p>
        </div>
      </div>
      <Button
        variant={isConnected ? "outline" : "default"}
        size="sm"
        onClick={onConnect}
      >
        {isConnected ? "Manage" : "Connect"}
      </Button>
    </div>
  )
}
