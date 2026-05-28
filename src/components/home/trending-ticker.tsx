"use client"

import Link from "next/link"
import type { Post } from "@/types/database"
import { formatDate } from "@/lib/utils"

interface TrendingTickerProps {
  posts: Post[]
}

export function TrendingTicker({ posts }: TrendingTickerProps) {
  if (posts.length === 0) return null

  return (
    <section className="border-y border-[#333333] bg-[#1a1a1a] py-3 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4">
        <span className="text-sm font-bold text-brand-amber uppercase tracking-wider shrink-0">
          Trending
        </span>
        <div className="overflow-hidden flex-1 relative">
          <div className="animate-ticker whitespace-nowrap flex gap-10">
            {[...posts, ...posts].map((post, i) => (
              <Link
                key={`${post.id}-${i}`}
                href={`/${post.slug}`}
                className="text-sm text-gray-300 hover:text-brand-amber transition-colors inline-flex items-center gap-2"
              >
                <span className="text-brand-amber font-bold">#{(i % posts.length) + 1}</span>
                {post.title}
                <span className="text-gray-500 ml-2">{post.published_at ? formatDate(post.published_at) : ""}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
