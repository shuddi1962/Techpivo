"use client"

import Link from "next/link"
import type { Post, Category, Profile } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { formatDate } from "@/lib/utils"

type PostWithRelations = Post & { category?: Category; author?: Profile }

interface HomeHeroProps {
  posts: PostWithRelations[]
}

export function HomeHero({ posts }: HomeHeroProps) {
  if (posts.length === 0) return null

  const [main, ...rest] = posts

  return (
    <section className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6 px-4 sm:px-6 lg:px-8 pt-6 pb-10">
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
            {main.category?.name || "Tech"}
          </Badge>
          <h2 className="text-xl lg:text-3xl font-bold text-white mb-2 line-clamp-3">
            {main.title}
          </h2>
          <p className="text-xs lg:text-sm text-gray-300 line-clamp-2 mb-2 lg:mb-3">{main.excerpt}</p>
          <div className="flex items-center gap-2 lg:gap-3 text-xs lg:text-sm text-gray-400">
            <Avatar className="h-6 w-6 lg:h-8 lg:w-8">
              <AvatarImage src={main.author?.avatar_url || undefined} />
              <AvatarFallback>{main.author?.full_name?.[0] || "A"}</AvatarFallback>
            </Avatar>
            <span>{main.author?.full_name || "Blizine"}</span>
            <span>·</span>
            <span>{main.published_at ? formatDate(main.published_at) : ""}</span>
            <span>·</span>
            <span>{main.reading_time} min read</span>
          </div>
        </div>
      </Link>

      <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-6">
        {rest.slice(0, 2).map((post) => (
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
                {post.category?.name || "Tech"}
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
