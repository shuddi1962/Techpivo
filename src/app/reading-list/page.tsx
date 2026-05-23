"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Post } from "@/types/database"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import { Bookmark, BookOpen } from "lucide-react"

export default function ReadingListPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Read from localStorage for simplicity
    const savedIds = JSON.parse(localStorage.getItem("readingList") || "[]")
    if (savedIds.length === 0) {
      setLoading(false)
      return
    }
    const supabase = createClient()
    supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .in("id", savedIds)
      .then(({ data }) => {
        if (data) setPosts(data)
        setLoading(false)
      })
  }, [])

  return (
    <div className="container py-6">
      <div className="flex items-center gap-3 mb-8">
        <Bookmark className="h-6 w-6 text-brand-indigo" />
        <h1 className="text-3xl font-bold">Reading List</h1>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <Link key={post.id} href={`/${post.slug}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex gap-4">
                  <div className="w-24 h-20 shrink-0 rounded-md bg-cover bg-center"
                    style={{ backgroundImage: `url(${post.featured_image || "/api/placeholder/200/150"})` }} />
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold line-clamp-2">{post.title}</h2>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{post.excerpt}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {post.published_at ? formatDate(post.published_at) : ""} · {post.reading_time} min read
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">Your reading list is empty.</p>
          <p className="text-sm text-muted-foreground mt-1">Click the bookmark icon on posts to save them here.</p>
        </div>
      )}
    </div>
  )
}
