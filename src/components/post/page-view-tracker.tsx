"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { trackView } from "@/lib/view-tracking"

export function PageViewTracker() {
  const pathname = usePathname()
  const lastRef = useRef<string>("")

  useEffect(() => {
    const path = pathname || "/"
    if (path === lastRef.current) return
    lastRef.current = path

    const tracked = sessionStorage.getItem("tracked_paths")
    const trackedPaths: string[] = tracked ? JSON.parse(tracked) : []
    if (trackedPaths.includes(path)) return
    trackedPaths.push(path)
    try {
      sessionStorage.setItem("tracked_paths", JSON.stringify(trackedPaths.slice(-50)))
    } catch {}

    trackView({ pageUrl: path, referrer: document.referrer || "" })
  }, [pathname])

  return null
}
