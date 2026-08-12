"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * Realtime-aware site_pages publish state for navigation components.
 * A slug is public when: no DB row exists (registry defaults) OR the row is
 * published. Subscribes to site_pages changes so header/footer links hide and
 * reappear live when an admin toggles a page's Published switch.
 */
export function usePublishedPages() {
  const [pages, setPages] = useState<Record<string, boolean> | null>(null)

  useEffect(() => {
    let mounted = true
    const supabase = createClient()
    const load = async () => {
      const { data } = await supabase.from("site_pages").select("slug, is_published")
      if (!mounted) return
      const map: Record<string, boolean> = {}
      if (data) {
        for (const r of data as { slug: string; is_published: boolean | null }[]) map[r.slug] = !!r.is_published
      }
      setPages(map)
    }
    load()
    const channel = supabase
      .channel(`nav_site_pages_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_pages" }, () => load())
      .subscribe()
    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  const isPublic = useCallback(
    (slug: string): boolean => {
      if (!pages) return true
      const v = pages[slug]
      return v === undefined ? true : v
    },
    [pages]
  )

  return { isPublic, ready: pages !== null }
}