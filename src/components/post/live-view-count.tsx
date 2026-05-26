"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

export function LiveViewCount({ postId, initialViews }: { postId: string; initialViews: number }) {
  const [views, setViews] = useState(initialViews)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current
    let cancelled = false

    const updateViews = async () => {
      const { data } = await supabase.from("posts").select("views").eq("id", postId).single()
      if (!cancelled && data) setViews(data.views || 0)
    }

    const channel = supabase
      .channel("live-view-count")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts", filter: `id=eq.${postId}` }, (payload: any) => {
        if (!cancelled && payload.new && typeof payload.new.views === "number") setViews(payload.new.views)
      })
      .subscribe()

    const interval = setInterval(updateViews, 3000)

    return () => {
      cancelled = true
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [postId])

  return <span>{views.toLocaleString()} views</span>
}
