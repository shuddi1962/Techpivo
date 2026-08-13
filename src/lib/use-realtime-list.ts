"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface UseRealtimeListOptions {
  /** Server/client fetcher returning the list — re-run on every refresh */
  fetcher: () => Promise<any[]>
  /** Table to subscribe to for realtime (optional — polling still applies) */
  table?: string
  /** postgres_changes event filter, defaults to all events */
  event?: "INSERT" | "UPDATE" | "DELETE" | "*"
  /** postgres_changes row filter, e.g. "post_id=eq.123" */
  filter?: string
  /** polling interval ms, default 30s */
  pollMs?: number
}

/**
 * Standard community realtime pattern: unique channel + removeChannel on
 * unmount + periodic poll + focus refresh. Never show stale lists.
 */
export function useRealtimeList<T extends { id: string }>({
  fetcher,
  table,
  event = "*",
  filter,
  pollMs = 30000,
}: UseRealtimeListOptions) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const data = await fetcherRef.current()
      setItems(data)
      setLastSync(new Date())
    } catch {
      // keep existing items on transient errors; poll will retry
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null
    const supabase = createClient()

    load()
    if (table) {
      channel = supabase
        .channel(`${table}_realtime_${Date.now()}_${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event, schema: "public", table, ...(filter ? { filter } : {}) },
          () => load(true)
        )
        .subscribe()
    }
    const poll = setInterval(() => load(true), pollMs)
    const onFocus = () => load(true)
    window.addEventListener("focus", onFocus)

    return () => {
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
      if (channel) supabase.removeChannel(channel)
    }
  }, [table, event, filter, pollMs, load])

  return { items, setItems, loading, lastSync, refresh: () => load() }
}
