"use client"

import { X, Globe, Link, MessageCircle, Send, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ShareButtonsProps {
  title: string
  url: string
  excerpt?: string
}

const platforms = [
  {
    name: "Twitter",
    icon: X,
    getUrl: (title: string, url: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  {
    name: "Facebook",
    icon: Globe,
    getUrl: (_title: string, url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: "LinkedIn",
    icon: Link,
    getUrl: (_title: string, url: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    name: "Reddit",
    icon: MessageCircle,
    getUrl: (title: string, url: string) =>
      `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  },
  {
    name: "Telegram",
    icon: Send,
    getUrl: (title: string, url: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    name: "WhatsApp",
    icon: MessageSquare,
    getUrl: (_title: string, url: string, excerpt?: string) => {
      const text = excerpt ? `${_title} - ${excerpt}` : _title
      return `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`
    },
  },
]

export function ShareButtons({ title, url, excerpt }: ShareButtonsProps) {
  function openShare(shareUrl: string) {
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=400")
  }

  return (
    <div className="flex items-center gap-1">
      {platforms.map((platform) => {
        const Icon = platform.icon
        return (
          <Button
            key={platform.name}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title={`Share on ${platform.name}`}
            onClick={() => openShare(platform.getUrl(title, url, excerpt))}
          >
            <Icon className="h-4 w-4" />
          </Button>
        )
      })}
    </div>
  )
}
