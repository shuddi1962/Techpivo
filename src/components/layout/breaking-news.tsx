"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Post } from "@/types/database"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export function BreakingNews() {
  const [posts, setPosts] = useState<Post[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .eq("is_breaking", true)
      .order("published_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setPosts(data)
      })
  }, [])

  if (posts.length === 0) return null

  return (
    <div className="bg-brand-navy text-white py-1.5 overflow-hidden">
      <div className="container flex items-center gap-3">
        <Badge variant="amber" className="shrink-0 text-[10px] uppercase tracking-wider px-2 py-0.5">
          Breaking
        </Badge>
        <div className="overflow-hidden flex-1 relative">
          <div className="animate-ticker whitespace-nowrap flex gap-12">
            {[...posts, ...posts].map((post, i) => (
              <Link
                key={`${post.id}-${i}`}
                href={`/${post.slug}`}
                className="text-sm hover:text-brand-amber transition-colors inline-block"
              >
                {post.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
