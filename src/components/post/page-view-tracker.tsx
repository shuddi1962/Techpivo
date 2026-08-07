"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

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

    const data: Record<string, string> = { pageUrl: path }
    data.referrer = document.referrer || ""

    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (!timeZone || timeZone === "UTC") return
      const parts = timeZone.split("/")
      const region = parts[0] || ""
      if (!region || region === "Etc") return
      const countryMap: Record<string, string> = {
        "America": "US", "Europe": "GB", "Asia": "IN", "Africa": "ZA",
        "Australia": "AU", "Pacific": "NZ", "Atlantic": "US",
      }
      const detected = parts.length === 2
        ? (parts[1]?.length === 2 ? parts[1] : countryMap[region] || region)
        : countryMap[region] || null
      if (detected) data.country = detected
    } catch {}

    fetch("/api/increment-views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch((err) => console.error("PageViewTracker error:", err))
  }, [pathname])

  return null
}
