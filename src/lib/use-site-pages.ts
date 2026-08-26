"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type PageInfo = { is_published: boolean; placement: string; title: string }

function parsePlacement(raw: string): string[] {
  if (!raw) return []
  return raw.split(",").map((s) => s.trim()).filter(Boolean)
}

/**
 * Realtime-aware site_pages publish + placement state for navigation components.
 * A slug is public when: no DB row exists (registry defaults) OR the row is published.
 * Placement is now comma-separated (e.g. "topbar,header,footer").
 * A slug appears in header when its placement list includes "header".
 * A slug appears in footer when its placement list includes "footer".
 * A slug appears in topbar when its placement list includes "topbar".
 * A slug appears in menu when its placement list includes "menu".
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
            placement: r.placement || "",
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
      if (!pages) return false
      const v = pages[slug]
      return v === undefined ? true : v.is_published
    },
    [pages]
  )

  const isInTopbar = useCallback(
    (slug: string): boolean => {
      if (!pages) return false
      const v = pages[slug]
      if (!v) return false
      return parsePlacement(v.placement).includes("topbar")
    },
    [pages]
  )

  const isInHeader = useCallback(
    (slug: string): boolean => {
      if (!pages) return false
      const v = pages[slug]
      if (!v) return false
      return parsePlacement(v.placement).includes("header")
    },
    [pages]
  )

  const isInFooter = useCallback(
    (slug: string): boolean => {
      if (!pages) return false
      const v = pages[slug]
      if (!v) return false
      return parsePlacement(v.placement).includes("footer")
    },
    [pages]
  )

  const isInMenu = useCallback(
    (slug: string): boolean => {
      if (!pages) return false
      const v = pages[slug]
      if (!v) return false
      return parsePlacement(v.placement).includes("menu")
    },
    [pages]
  )

  /** Return all published pages whose placement list includes ANY of the given values. */
  const getPagesForPlacement = useCallback(
    (placements: string[]): { slug: string; label: string; path: string }[] => {
      if (!pages) return []
      const results: { slug: string; label: string; path: string }[] = []
      for (const [slug, info] of Object.entries(pages)) {
        if (!info.is_published) continue
        const tags = parsePlacement(info.placement)
        if (!tags.some((t) => placements.includes(t))) continue
        results.push({ slug, label: info.title || slug, path: `/${slug}` })
      }
      return results
    },
    [pages]
  )

  return { isPublic, isInTopbar, isInHeader, isInFooter, isInMenu, getPagesForPlacement, pages, ready: pages !== null }
}
