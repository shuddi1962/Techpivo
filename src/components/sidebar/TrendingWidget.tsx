"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { CategoryBadge } from "@/components/ui/CategoryBadge"

export function TrendingWidget({ posts: initialPosts }: { posts: any[] }) {
  const [posts, setPosts] = useState(initialPosts)

  useEffect(() => {
    if (!initialPosts?.length) {
      fetch("/api/posts?limit=5&sort=views")
        .then((r) => r.ok ? r.json() : [])
        .then((data) => {
          if (Array.isArray(data) && data.length) setPosts(data)
        })
        .catch(() => {})
    }
  }, [initialPosts])

  if (!posts?.length) return null
  return (
    <div className="sidebar-card trending-widget">
      <div className="sidebar-card-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 18L12 7L16 18M9.5 14.5H14.5"/>
          <path d="M4 22L12 2L20 22"/>
        </svg>
        <span className="sidebar-card-title" style={{ color: "var(--accent2)" }}>Trending Now</span>
      </div>
      <ul className="trending-list">
        {posts.map((post: any, i: number) => (
          <li key={post.id} className={`trending-item${i === 0 ? " trending-top" : ""}`}>
            <span className={`trending-badge${i < 3 ? [" gold", " silver", " bronze"][i] : ""}`}>
              {i + 1}
            </span>
            <div className="trending-content">
              <Link href={`/${post.slug}`} className="trending-title">{post.title}</Link>
              <div className="trending-meta">
                <CategoryBadge name={post.categories?.name} color={post.categories?.color} size="xs" />
                {post.views && (
                  <span className="trending-views">{post.views.toLocaleString()} views</span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
