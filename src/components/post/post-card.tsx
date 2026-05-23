"use client"

import Link from "next/link"
import type { Post } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface PostCardProps {
  post: Post
  variant?: "default" | "compact" | "horizontal" | "hero"
  categoryName?: string
  authorName?: string
  authorAvatar?: string | null
}

export function PostCard({ post, variant = "default", categoryName, authorName, authorAvatar }: PostCardProps) {
  if (variant === "hero") {
    return (
      <Link
        href={`/${post.slug}`}
        className="relative group rounded-xl overflow-hidden min-h-[400px] block"
      >
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url(${post.featured_image || "/api/placeholder/800/600"})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          {categoryName && (
            <Badge variant="indigo" className="mb-3">
              {categoryName}
            </Badge>
          )}
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 line-clamp-2">
            {post.title}
          </h2>
          <p className="text-sm text-gray-300 line-clamp-2 mb-3">{post.excerpt}</p>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <Avatar className="h-8 w-8">
              <AvatarImage src={authorAvatar || undefined} />
              <AvatarFallback>{authorName?.[0] || "A"}</AvatarFallback>
            </Avatar>
            <span>{authorName || "Blizine"}</span>
            <span>·</span>
            <span>{post.published_at ? formatDate(post.published_at) : ""}</span>
            <span>·</span>
            <span>{post.reading_time} min read</span>
          </div>
        </div>
      </Link>
    )
  }

  if (variant === "horizontal") {
    return (
      <Link href={`/${post.slug}`} className="group flex gap-4">
        <div
          className="w-40 h-28 shrink-0 rounded-lg bg-cover bg-center"
          style={{ backgroundImage: `url(${post.featured_image || "/api/placeholder/200/150"})` }}
        />
        <div className="flex-1 min-w-0">
          {categoryName && (
            <Badge variant="indigo" className="mb-1 text-[10px]">
              {categoryName}
            </Badge>
          )}
          <h3 className="font-semibold group-hover:text-brand-indigo transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {authorName && <span>{authorName} · </span>}
            {post.published_at ? formatDate(post.published_at) : ""} · {post.reading_time} min read
          </p>
        </div>
      </Link>
    )
  }

  if (variant === "compact") {
    return (
      <Link href={`/${post.slug}`} className="group flex gap-3 items-start">
        <div
          className="w-16 h-16 shrink-0 rounded-lg bg-cover bg-center"
          style={{ backgroundImage: `url(${post.featured_image || "/api/placeholder/80/80"})` }}
        />
        <div className="min-w-0">
          <h4 className="text-sm font-medium group-hover:text-brand-indigo transition-colors line-clamp-2">
            {post.title}
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            {post.published_at ? formatDate(post.published_at) : ""}
          </p>
        </div>
      </Link>
    )
  }

  return (
    <Link href={`/${post.slug}`} className="group block">
      <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
        <div
          className="h-44 bg-cover bg-center"
          style={{ backgroundImage: `url(${post.featured_image || "/api/placeholder/400/250"})` }}
        />
        <CardContent className="p-4">
          {categoryName && (
            <Badge variant="indigo" className="mb-2">
              {categoryName}
            </Badge>
          )}
          <h3 className="font-bold group-hover:text-brand-indigo transition-colors line-clamp-2 mb-1">
            {post.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{post.excerpt}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Avatar className="h-6 w-6">
              <AvatarImage src={authorAvatar || undefined} />
              <AvatarFallback className="text-[10px]">{authorName?.[0] || "A"}</AvatarFallback>
            </Avatar>
            <span>{authorName || "Blizine"}</span>
            <span>·</span>
            <span>{post.published_at ? formatDate(post.published_at) : ""}</span>
            <span>·</span>
            <span>{post.reading_time} min read</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
