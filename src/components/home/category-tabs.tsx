"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Post, Category } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { CATEGORY_COLORS } from "@/lib/constants"

export function CategoryTabs() {
  const [categories, setCategories] = useState<Category[]>([])
  const [active, setActive] = useState<string>("")
  const [posts, setPosts] = useState<Post[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.from("categories").select("*").order("name").then(({ data }) => {
      if (data && data.length > 0) {
        setCategories(data)
        setActive(data[0].id)
      }
    })
  }, [])

  useEffect(() => {
    if (!active) return
    const supabase = createClient()
    supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .eq("category_id", active)
      .order("published_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setPosts(data)
      })
  }, [active])

  if (categories.length === 0) return null

  const main = posts[0]
  const rest = posts.slice(1, 5)

  return (
    <section className="mb-10">
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
        <h2 className="text-xl font-bold shrink-0 mr-2">Don&apos;t Miss</h2>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActive(cat.id)}
            className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
              active === cat.id
                ? "bg-brand-navy text-white dark:bg-white dark:text-brand-navy"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {main && (
          <Link href={`/${main.slug}`} className="lg:col-span-2 group">
            <div
              className="rounded-xl overflow-hidden h-52 bg-cover bg-center mb-3"
              style={{ backgroundImage: `url(${main.featured_image || "/api/placeholder/500/300"})` }}
            />
            <Badge
              variant="indigo"
              className="mb-2"
            >
              {categories.find((c) => c.id === main.category_id)?.name}
            </Badge>
            <h3 className="text-xl font-bold group-hover:text-brand-indigo transition-colors line-clamp-2">
              {main.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{main.excerpt}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {main.published_at ? formatDate(main.published_at) : ""} · {main.reading_time} min read
            </p>
          </Link>
        )}

        <div className="lg:col-span-3 space-y-4">
          {rest.map((post) => (
            <Link key={post.id} href={`/${post.slug}`} className="flex gap-4 group">
              <div
                className="w-24 h-24 shrink-0 rounded-lg bg-cover bg-center"
                style={{ backgroundImage: `url(${post.featured_image || "/api/placeholder/120/120"})` }}
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold group-hover:text-brand-indigo transition-colors line-clamp-2">
                  {post.title}
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{post.excerpt}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {post.published_at ? formatDate(post.published_at) : ""} · {post.reading_time} min read
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
