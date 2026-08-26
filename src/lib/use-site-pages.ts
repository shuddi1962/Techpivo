"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type PageInfo = { is_published: boolean; placement: string; title: string }

/**
 * Realtime-aware site_pages publish + placement state for navigation components.
 * A slug is public when: no DB row exists (registry defaults) OR the row is published.
 * A slug appears in header when placement is 'header' or 'both' (or no DB row).
 * A slug appears in footer when placement is 'footer' or 'both' (or no DB row).
 * Subscribes to site_pages changes so nav links hide/reappear live.
 */
export function usePublishedPages() {
  const [pages, setPages] = useState<Record<string, PageInfo> | null>(null)

  useEffect(() => {
    let mounted = true
    const supabase = createClient()
    const load = async () => {
      const { data } = await supabase.from("site_pages").select("slug, is_published, placement, title")
      if (!mounted) return
      const map: Record<string, PageInfo> = {}
      if (data) {
        for (const r of data as { slug: string; is_published: boolean | null; placement: string | null; title: string | null }[]) {
          map[r.slug] = {
            is_published: !!r.is_published,
            placement: r.placement || "both",
            title: r.title || r.slug,
          }
        }
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
      return v === undefined ? true : v.is_published
    },
    [pages]
  )

  const isInHeader = useCallback(
    (slug: string): boolean => {
      if (!pages) return true
      const v = pages[slug]
      if (!v) return true
      const p = v.placement
      return p === "header" || p === "both"
    },
    [pages]
  )

  const isInFooter = useCallback(
    (slug: string): boolean => {
      if (!pages) return true
      const v = pages[slug]
      if (!v) return true
      const p = v.placement
      return p === "footer" || p === "both"
    },
    [pages]
  )

  const isInMenu = useCallback(
    (slug: string): boolean => {
      if (!pages) return true
      const v = pages[slug]
      if (!v) return true
      const p = v.placement
      return p === "menu" || p === "both"
    },
    [pages]
  )

  /** Return all published pages whose placement matches the given set (e.g. "header"|"both"). */
  const getPagesForPlacement = useCallback(
    (placements: string[]): { slug: string; label: string; path: string }[] => {
      if (!pages) return []
      const results: { slug: string; label: string; path: string }[] = []
      for (const [slug, info] of Object.entries(pages)) {
        if (!info.is_published) continue
        if (!placements.includes(info.placement)) continue
        results.push({ slug, label: info.title || slug, path: `/${slug}` })
      }
      return results
    },
    [pages]
  )

  return { isPublic, isInHeader, isInFooter, isInMenu, getPagesForPlacement, pages, ready: pages !== null }
}
