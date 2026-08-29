"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { trackView } from "@/lib/view-tracking"

const DEDUPE_MS = 30 * 60 * 1000

function getTrackedPaths(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem("tp_tracked_paths")
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function markTrackedPath(path: string) {
  try {
    const map = getTrackedPaths()
    map[path] = Date.now()
    const keys = Object.keys(map)
    if (keys.length > 100) {
      const oldest = keys.sort((a, b) => map[a] - map[b])[0]
      delete map[oldest]
    }
    sessionStorage.setItem("tp_tracked_paths", JSON.stringify(map))
  } catch {}
}

export function PageViewTracker() {
  const pathname = usePathname()
  const lastRef = useRef<string>("")

  useEffect(() => {
    const path = pathname || "/"
    if (path === lastRef.current) return
    lastRef.current = path

    const map = getTrackedPaths()
    const last = map[path] || 0
    if (last && Date.now() - last < DEDUPE_MS) return
    markTrackedPath(path)

    trackView({ pageUrl: path, referrer: document.referrer || "" })
  }, [pathname])

  return null
}
