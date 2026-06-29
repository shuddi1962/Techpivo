"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export type BannerSize = "468x60" | "300x250" | "160x600" | "160x300" | "320x50" | "728x90"

interface BannerConfig {
  key: string
  width: number
  height: number
  invokeUrl: string
}

const BANNERS: Record<BannerSize, BannerConfig> = {
  "468x60": {
    key: "216ec743fdbeb37c0ccaeef4c8e3e51a",
    width: 468,
    height: 60,
    invokeUrl: "https://www.highperformanceformat.com/216ec743fdbeb37c0ccaeef4c8e3e51a/invoke.js",
  },
  "300x250": {
    key: "c364ee0283c549591f94e02fbb3b7105",
    width: 300,
    height: 250,
    invokeUrl: "https://www.highperformanceformat.com/c364ee0283c549591f94e02fbb3b7105/invoke.js",
  },
  "160x600": {
    key: "5274c6cc67b0072a2776fe779f3c238a",
    width: 160,
    height: 600,
    invokeUrl: "https://www.highperformanceformat.com/5274c6cc67b0072a2776fe779f3c238a/invoke.js",
  },
  "160x300": {
    key: "21d2dee3837f8215e2c68cfff95b62d3",
    width: 160,
    height: 300,
    invokeUrl: "https://www.highperformanceformat.com/21d2dee3837f8215e2c68cfff95b62d3/invoke.js",
  },
  "320x50": {
    key: "5acbb88a97a8e5b4c6b2bc95ff243882",
    width: 320,
    height: 50,
    invokeUrl: "https://www.highperformanceformat.com/5acbb88a97a8e5b4c6b2bc95ff243882/invoke.js",
  },
  "728x90": {
    key: "fe76f1bb874634a3233c20cc61c512ab",
    width: 728,
    height: 90,
    invokeUrl: "https://www.highperformanceformat.com/fe76f1bb874634a3233c20cc61c512ab/invoke.js",
  },
}

interface AdsterraBannerProps {
  size: BannerSize
  className?: string
  label?: string
}

export function AdsterraBanner({ size, className, label }: AdsterraBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const config = BANNERS[size]

  useEffect(() => {
    if (!containerRef.current) return
    if (!config) return

    const scriptKey = `adsterra-banner-${config.key}`
    if (containerRef.current.getAttribute("data-loaded") === scriptKey) return

    const script = document.createElement("script")
    script.async = true
    script.src = config.invokeUrl
    script.onload = () => {
      containerRef.current?.setAttribute("data-loaded", scriptKey)
    }

    containerRef.current.innerHTML = ""
    containerRef.current.appendChild(script)
  }, [config])

  return (
    <div className={cn("adsterra-banner flex flex-col items-center", className)}>
      {label && (
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-1">{label}</span>
      )}
      <div
        ref={containerRef}
        style={{ width: config.width, height: config.height }}
        className="overflow-hidden"
      />
    </div>
  )
}
