"use client"

import { useEffect } from "react"
import { trackView } from "@/lib/view-tracking"

export function ViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
    const tracked = sessionStorage.getItem(`viewed_${postId}`)
    if (tracked) return
    sessionStorage.setItem(`viewed_${postId}`, "1")

    trackView({ postId, pageUrl: window.location.pathname, referrer: document.referrer || "" })
  }, [postId])

  return null
}
