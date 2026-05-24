"use client"

import { useState } from "react"
import { PostCard } from "@/components/post/post-card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

interface LatestArticlesProps {
  initialPosts: any[]
}

export function LatestArticles({ initialPosts }: LatestArticlesProps) {
  const [posts, setPosts] = useState(initialPosts)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialPosts.length >= 9)

  const handleLoadMore = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("posts")
      .select("*, category:categories(*), author:profiles(*)")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .range(posts.length, posts.length + 5)
    if (data && data.length > 0) {
      setPosts([...posts, ...data])
      if (data.length < 6) setHasMore(false)
    } else {
      setHasMore(false)
    }
    setLoading(false)
  }

  return (
    <section>
      <h2 className="text-2xl font-bold mb-6">Latest Articles</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center mt-8">
          <Button onClick={handleLoadMore} disabled={loading} variant="outline" size="lg">
            {loading ? "Loading..." : "Load More Articles"}
          </Button>
        </div>
      )}
    </section>
  )
}
