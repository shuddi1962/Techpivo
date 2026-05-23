import { createClient } from "@/lib/supabase/client"
import { useCallback, useEffect, useState } from "react"
import type { Post, Category } from "@/types/database"

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("categories")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (data) setCategories(data)
        setLoading(false)
      })
  }, [])

  return { categories, loading }
}

export function useRecentPosts(limit = 10) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        if (data) setPosts(data)
        setLoading(false)
      })
  }, [limit])

  return { posts, loading }
}
