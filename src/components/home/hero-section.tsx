"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Post, Category } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { formatDate, readingTime } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export function HeroSection() {
  const [featured, setFeatured] = useState<Post[]>([])
  const [categories, setCategories] = useState<Map<string, Category>>(new Map())
  const [authors, setAuthors] = useState<Map<string, { full_name: string; avatar_url: string | null }>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase
        .from("posts")
        .select("*, category:categories(*), author:profiles(*)")
        .eq("status", "published")
        .eq("is_featured", true)
        .order("published_at", { ascending: false })
        .limit(3),
      supabase.from("categories").select("*"),
    ]).then(([postsRes, catsRes]) => {
      if (postsRes.data) setFeatured(postsRes.data as any)
      if (catsRes.data) {
        const map = new Map()
        catsRes.data.forEach((c) => map.set(c.id, c))
        setCategories(map)
      }
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10">
        <div className="lg:col-span-3">
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-[190px] w-full rounded-lg" />
          <Skeleton className="h-[190px] w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (featured.length === 0) return null

  const main = featured[0]
  const right = featured.slice(1, 3)

  return (
    <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10">
      {/* Main Featured Post */}
      <Link
        href={`/${main.slug}`}
        className="lg:col-span-3 relative group rounded-xl overflow-hidden min-h-[400px]"
      >
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url(${main.featured_image || "/api/placeholder/800/600"})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <Badge variant="indigo" className="mb-3">
            {categories.get(main.category_id)?.name || "Tech"}
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 line-clamp-3">
            {main.title}
          </h2>
          <p className="text-sm text-gray-300 line-clamp-2 mb-3">{main.excerpt}</p>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <Avatar className="h-8 w-8">
              <AvatarImage src={(main as any).author?.avatar_url} />
              <AvatarFallback>{(main as any).author?.full_name?.[0] || "A"}</AvatarFallback>
            </Avatar>
            <span>{(main as any).author?.full_name || "Blizine"}</span>
            <span>·</span>
            <span>{main.published_at ? formatDate(main.published_at) : ""}</span>
            <span>·</span>
            <span>{main.reading_time} min read</span>
          </div>
        </div>
      </Link>

      {/* Right Column */}
      <div className="lg:col-span-2 space-y-6">
        {right.map((post) => (
          <Link
            key={post.id}
            href={`/${post.slug}`}
            className="relative group rounded-xl overflow-hidden min-h-[190px] block"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url(${post.featured_image || "/api/placeholder/400/300"})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <Badge variant="indigo" className="mb-2 text-[10px]">
                {categories.get(post.category_id)?.name || "Tech"}
              </Badge>
              <h3 className="text-lg font-bold text-white line-clamp-2">{post.title}</h3>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                <span>{post.published_at ? formatDate(post.published_at) : ""}</span>
                <span>·</span>
                <span>{post.reading_time} min read</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
