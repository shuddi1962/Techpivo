"use client"

import Link from "next/link"

export function BreakingTicker({ posts }: { posts: { title: string; slug: string }[] }) {
  if (posts.length === 0) return null

  return (
    <div className="breaking-ticker">
      <span className="ticker-badge">BREAKING</span>
      <div className="ticker-track">
        <div className="ticker-scroll">
          {[...posts, ...posts].map((post, i) => (
            <Link key={`${post.slug}-${i}`} href={`/${post.slug}`} className="ticker-item">
              {post.title}
              <span className="ticker-sep">◆</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
