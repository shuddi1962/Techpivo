"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Post, Category } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { formatDate } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export function HeroSection() {
  const [featured, setFeatured] = useState<Post[]>([])
  const [categories, setCategories] = useState<Map<string, Category>>(new Map())
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
    ]).then(async ([postsRes, catsRes]) => {
      let data = postsRes.data as any[]
      if (!data || data.length === 0) {
        const { data: latest } = await supabase
          .from("posts")
          .select("*, category:categories(*), author:profiles(*)")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(3)
        data = (latest || []) as any
      }
      if (data) setFeatured(data)
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
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6 px-4 sm:px-6 lg:px-8 pt-6 pb-10">
        <div className="lg:col-span-3">
          <Skeleton className="h-[300px] lg:h-[420px] w-full rounded-lg" />
        </div>
        <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-6">
          <Skeleton className="h-[180px] lg:h-[195px] w-full rounded-lg" />
          <Skeleton className="h-[180px] lg:h-[195px] w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (featured.length === 0) return null

  const main = featured[0]
  const right = featured.slice(1, 3)

  return (
    <section className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6 px-4 sm:px-6 lg:px-8 pt-6 pb-10">
      {/* Main Featured Post */}
      <Link
        href={`/${main.slug}`}
        className="lg:col-span-3 relative group rounded-xl overflow-hidden min-h-[300px] lg:min-h-[420px]"
      >
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: main.featured_image ? `url(${main.featured_image})` : undefined }}
        />
        {!main.featured_image && (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-6">
          <Badge variant="indigo" className="mb-2 lg:mb-3">
            {categories.get(main.category_id)?.name || "Tech"}
          </Badge>
          <h2 className="text-xl lg:text-3xl font-bold text-white mb-2 line-clamp-3">
            {main.title}
          </h2>
          <p className="text-xs lg:text-sm text-gray-300 line-clamp-2 mb-2 lg:mb-3">{main.excerpt}</p>
          <div className="flex items-center gap-2 lg:gap-3 text-xs lg:text-sm text-gray-400">
            <Avatar className="h-6 w-6 lg:h-8 lg:w-8">
              <AvatarImage src={(main as any).author?.avatar_url} />
              <AvatarFallback>{(main as any).author?.full_name?.[0] || "A"}</AvatarFallback>
            </Avatar>
            <span>{(main as any).author?.full_name || "Techpivo"}</span>
          </div>
        </div>
      </Link>

      {/* Right Column */}
      <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-6">
        {right.map((post) => (
          <Link
            key={post.id}
            href={`/${post.slug}`}
            className="relative group rounded-xl overflow-hidden min-h-[180px] lg:min-h-[195px] block"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundImage: post.featured_image ? `url(${post.featured_image})` : undefined }}
            />
            {!post.featured_image && (
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-700" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <Badge variant="indigo" className="mb-2 text-[10px]">
                {categories.get(post.category_id)?.name || "Tech"}
              </Badge>
              <h3 className="text-lg font-bold text-white line-clamp-2">{post.title}</h3>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400"></div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
