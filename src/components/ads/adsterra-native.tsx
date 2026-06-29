"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface AdsterraNativeProps {
  className?: string
  containerId?: string
}

export function AdsterraNative({ className, containerId = "container-11f1b6de6b89e925ac0493c9490722bd" }: AdsterraNativeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptLoaded = useRef(false)

  useEffect(() => {
    if (scriptLoaded.current) return
    if (!containerRef.current) return

    const scriptSrc = "https://pl30130394.effectivecpmnetwork.com/11f1b6de6b89e925ac0493c9490722bd/invoke.js"

    // Check if script already exists on page
    const existingScript = document.querySelector(`script[src="${scriptSrc}"]`)
    if (existingScript) {
      scriptLoaded.current = true
      return
    }

    const script = document.createElement("script")
    script.async = true
    script.setAttribute("data-cfasync", "false")
    script.src = scriptSrc
    script.onload = () => {
      scriptLoaded.current = true
    }
    document.body.appendChild(script)

    return () => {
      // Don't remove script on unmount - other instances may need it
    }
  }, [])

  return (
    <div className={cn("adsterra-native my-6", className)}>
      <div id={containerId} ref={containerRef} />
    </div>
  )
}
