"use client"

import { useEffect } from "react"
import { trackView } from "@/lib/view-tracking"

const DEDUPE_MS = 30 * 60 * 1000

export function ViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
    const key = `viewed_${postId}`
    const last = Number(sessionStorage.getItem(key) || 0)
    if (last && Date.now() - last < DEDUPE_MS) return
    sessionStorage.setItem(key, String(Date.now()))

    trackView({ postId, pageUrl: window.location.pathname, referrer: document.referrer || "" })
  }, [postId])

  return null
}
