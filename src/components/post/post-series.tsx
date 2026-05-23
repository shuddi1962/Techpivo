"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Series, Post } from "@/types/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface PostSeriesProps {
  seriesId: string
  currentPostId: string
}

export function PostSeries({ seriesId, currentPostId }: PostSeriesProps) {
  const [series, setSeries] = useState<Series | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from("series").select("*").eq("id", seriesId).single(),
      supabase
        .from("posts")
        .select("*")
        .eq("series_id", seriesId)
        .eq("status", "published")
        .order("published_at", { ascending: true }),
    ]).then(([seriesRes, postsRes]) => {
      if (seriesRes.data) setSeries(seriesRes.data)
      if (postsRes.data) setPosts(postsRes.data)
      setLoading(false)
    })
  }, [seriesId])

  if (loading) return null
  if (!series || posts.length === 0) return null

  const currentIndex = posts.findIndex((p) => p.id === currentPostId)
  const nextPost = currentIndex >= 0 && currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null
  const prevPost = currentIndex > 0 ? posts[currentIndex - 1] : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground font-normal">
          Part of:{" "}
          <span className="text-foreground font-semibold">{series.title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {posts.map((post, index) => {
            const isCurrent = post.id === currentPostId
            return (
              <li key={post.id}>
                {isCurrent ? (
                  <span className="flex items-center gap-2 text-sm font-medium text-primary">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {index + 1}
                    </span>
                    <span>{post.title}</span>
                  </span>
                ) : (
                  <Link
                    href={`/${post.slug}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {index + 1}
                    </span>
                    <span>{post.title}</span>
                  </Link>
                )}
              </li>
            )
          })}
        </ol>

        {series.description && (
          <p className="mt-4 text-sm text-muted-foreground border-t pt-4">
            {series.description}
          </p>
        )}

        {nextPost && (
          <div className="mt-4 border-t pt-4">
            <Link
              href={`/${nextPost.slug}`}
              className="flex items-center justify-between rounded-lg bg-accent p-3 hover:bg-accent/80 transition-colors"
            >
              <div>
                <p className="text-xs text-muted-foreground">Next in series</p>
                <p className="text-sm font-medium">{nextPost.title}</p>
              </div>
              <span className="text-lg">→</span>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
