"use client"

import dynamic from "next/dynamic"
import { useEffect, useState, type ReactNode } from "react"

// posthog-js is the heaviest client chunk on public pages (~100KB). It must
// never contend with LCP, so the chunk only downloads after the browser is
// idle (or 5s max) — analytics can afford to miss the first paint.
const PHProvider = dynamic(
  () => import("@/components/posthog-provider").then((m) => m.PHProvider),
  { ssr: false },
)

export function DeferredPostHog({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false
    const go = () => {
      if (!cancelled) setReady(true)
    }
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(go, { timeout: 5000 })
      return () => {
        cancelled = true
        ;(window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id)
      }
    }
    timer = setTimeout(go, 4000)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  if (!ready) return <>{children}</>
  return <PHProvider>{children}</PHProvider>
}
