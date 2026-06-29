"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"

export function MobileStickyBanner() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!containerRef.current || dismissed) return

    const script = document.createElement("script")
    script.async = true
    script.src = "https://www.highperformanceformat.com/5acbb88a97a8e5b4c6b2bc95ff243882/invoke.js"
    containerRef.current.appendChild(script)
  }, [dismissed])

  if (dismissed) return null

  return (
    <div className="mobile-sticky-ad">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-1 right-1 z-10 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
        aria-label="Close ad"
      >
        <X className="h-3 w-3" />
      </button>
      <div ref={containerRef} className="flex items-center justify-center" />
    </div>
  )
}
