"use client"

// Shared Media Library hook — single source of truth for the `media` bucket +
// `media_files` table. Keeps every surface (media page, post editor panels)
// in sync via Postgres realtime, with polling + focus refresh as fallback.
import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export interface LibraryFile {
  id: string
  name: string
  path: string
  url: string
  mimetype: string | null
  size: number | null
  created_at: string
}

export function useMediaLibrary(limit: number = 500) {
  const supabase = createClient()
  const [items, setItems] = useState<LibraryFile[]>([])
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("media_files")
      .select("id, name, path, url, mimetype, size, created_at")
      .order("created_at", { ascending: false })
      .limit(limit)
    if (mounted.current) {
      setItems((data as LibraryFile[]) || [])
      setLoading(false)
    }
  }, [supabase, limit])

  useEffect(() => {
    mounted.current = true
    refresh()

    const channel = supabase
      .channel("media_files_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "media_files" },
        () => refresh(),
      )
      .subscribe()

    const poll = setInterval(refresh, 30000)
    const onFocus = () => refresh()
    window.addEventListener("focus", onFocus)

    return () => {
      mounted.current = false
      channel.unsubscribe()
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
    }
  }, [supabase, refresh])

  const uploadFiles = useCallback(
    async (files: FileList | File[], folder = "uploads"): Promise<LibraryFile[]> => {
      const results: LibraryFile[] = []
      for (const file of Array.from(files)) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase()
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error } = await supabase.storage.from("media").upload(path, file, {
          contentType: file.type || "application/octet-stream",
          cacheControl: "3600",
          upsert: false,
        })
        if (error) continue
        const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path)
        const { data: row } = await supabase
          .from("media_files")
          .insert({
            name: file.name,
            path,
            url: publicUrl,
            mimetype: file.type || null,
            size: file.size,
          })
          .select("id, name, path, url, mimetype, size, created_at")
          .single()
        if (row) results.push(row as LibraryFile)
      }
      refresh()
      return results
    },
    [supabase, refresh],
  )

  const deleteItem = useCallback(
    async (file: LibraryFile) => {
      await supabase.storage.from("media").remove([file.path])
      await supabase.from("media_files").delete().eq("id", file.id)
      refresh()
    },
    [supabase, refresh],
  )

  return { items, loading, refresh, uploadFiles, deleteItem }
}
