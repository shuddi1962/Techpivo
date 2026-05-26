"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Post, Category } from "@/types/database"
import { formatDate } from "@/lib/utils"

export function SecondaryRow() {
  const [posts, setPosts] = useState<Post[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("posts")
      .select("*, category:categories(*)")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data) setPosts(data.slice(0, 2))
      })
  }, [])

  if (posts.length < 2) return null

  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold mb-6">More from Blizine</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {posts.map((post) => (
          <Link key={post.id} href={`/${post.slug}`} className="group">
            <div
              className="rounded-xl overflow-hidden h-52 bg-cover bg-center mb-3"
              style={{ backgroundImage: `url(${post.featured_image || "/api/placeholder/600/350"})` }}
            />
            <h3 className="text-xl font-bold group-hover:text-brand-indigo transition-colors line-clamp-2">
              {post.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.excerpt}</p>
            <p className="text-xs text-muted-foreground mt-2"></p>
          </Link>
        ))}
      </div>
    </section>
  )
}
