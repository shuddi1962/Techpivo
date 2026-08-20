"use client"

import { useEffect, useRef } from "react"

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

interface TurnstileWidgetProps {
  onToken: (token: string | null) => void
  resetKey?: string | number
  className?: string
}

export default function TurnstileWidget({ onToken, resetKey, className }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return
    const container = containerRef.current
    if (!container) return

    let cancelled = false

    const render = () => {
      if (cancelled || !window.turnstile || !containerRef.current) return
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {}
        widgetIdRef.current = null
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => onTokenRef.current(null),
      })
    }

    if (window.turnstile) {
      render()
    } else {
      const script = document.createElement("script")
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      script.async = true
      script.defer = true
      script.onload = render
      document.head.appendChild(script)
    }

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {}
        widgetIdRef.current = null
      }
    }
  }, [resetKey])

  if (!TURNSTILE_SITE_KEY) return null

  return <div ref={containerRef} className={className} />
}