"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Post } from "@/types/database"
import { formatDate } from "@/lib/utils"

export function TrendingGrid() {
  const [posts, setPosts] = useState<Post[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .order("views", { ascending: false })
      .limit(4)
      .then(({ data }) => {
        if (data) setPosts(data)
      })
  }, [])

  if (posts.length === 0) return null

  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold mb-6">Trending Now</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {posts.map((post, i) => (
          <Link key={post.id} href={`/${post.slug}`} className="group">
            <div className="relative rounded-xl overflow-hidden h-44 bg-cover bg-center mb-3"
              style={{ backgroundImage: `url(${post.featured_image || "/api/placeholder/400/250"})` }}
            >
              <span className="absolute top-2 left-2 bg-brand-navy text-white text-xs font-bold px-2 py-1 rounded">
                #{i + 1}
              </span>
            </div>
            <h3 className="font-semibold group-hover:text-brand-amber transition-colors line-clamp-2">
              {post.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1"></p>
          </Link>
        ))}
      </div>
    </section>
  )
}
