"use client"

import posthog from "posthog-js"
import { PostHogProvider as PostHogProviderRaw } from "posthog-js/react"
import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, useRef, Suspense } from "react"
import { createClient } from "@/lib/supabase/client"

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname
      if (searchParams?.toString()) url += "?" + searchParams.toString()
      posthog.capture("$pageview", { $current_url: url })
    }
  }, [pathname, searchParams])

  return null
}

function SuspenseWrapper() {
  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  )
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  const inited = useRef(false)

  useEffect(() => {
    if (inited.current) return
    inited.current = true

    const envKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const envHost = process.env.NEXT_PUBLIC_POSTHOG_HOST
    if (envKey && envHost) {
      posthog.init(envKey, {
        api_host: envHost,
        person_profiles: "identified_only",
        capture_pageview: false,
        loaded: (ph) => {
          if (process.env.NODE_ENV !== "production") ph.opt_out_capturing()
        },
      })
      return
    }

    const supabase = createClient()
    supabase.from("site_settings").select("key, value").in("key", ["posthog_api_key", "posthog_host"]).then(({ data }) => {
      if (!data) return
      const map: Record<string, string> = {}
      data.forEach((s) => { map[s.key] = s.value })
      const key = map.posthog_api_key
      const host = map.posthog_host
      if (key && host) {
        posthog.init(key, {
          api_host: host,
          person_profiles: "identified_only",
          capture_pageview: false,
          loaded: (ph) => {
            if (process.env.NODE_ENV !== "production") ph.opt_out_capturing()
          },
        })
      }
    })
  }, [])

  return (
    <PostHogProviderRaw client={posthog}>
      {children}
      <SuspenseWrapper />
    </PostHogProviderRaw>
  )
}
