"use client"

import Link from "next/link"
import { useState } from "react"
import { CategoryBadge } from "@/components/ui/CategoryBadge"

export function CategoryTabSection({ categories, posts }: { categories: any[]; posts: any[] }) {
  const [active, setActive] = useState("All")
  if (!posts.length && !categories.length) return null

  const tabs = ["All", ...categories.map((c: any) => c.name)]
  const filteredPosts = active === "All"
    ? posts
    : posts.filter((p: any) => p.categories?.name === active)

  const bigPost = filteredPosts[0]
  const listPosts = filteredPosts.slice(1, 5)

  return (
    <section className="tab-section">
      <div className="tab-header">
        <span className="dont-miss-label">Latest Stories</span>
        <div className="tabs-row">
          {tabs.slice(0, 8).map((tab) => (
            <button
              key={tab}
              onClick={() => setActive(tab)}
              className={`tab-btn${active === tab ? " tab-active" : ""}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="tab-content">
        {bigPost && (
          <Link href={`/${bigPost.slug}`} className="tab-big-post">
            <div className="tab-big-img-wrap">
              <img
                src={bigPost.featured_image || "/api/placeholder/600/450"}
                alt={bigPost.title}
                className="tab-big-img"
                style={{ width: '100%', height: '100%' }}
                loading="lazy"
              />
              <div className="tab-big-overlay" />
              <div className="tab-big-badge-wrap">
                <CategoryBadge name={bigPost.categories?.name} color={bigPost.categories?.color} size="xs" />
              </div>
            </div>
            <div className="tab-big-body">
              <h3 className="tab-big-title">{bigPost.title}</h3>
              <p className="tab-big-excerpt">{bigPost.excerpt}</p>
              <div className="tab-big-meta"></div>
            </div>
          </Link>
        )}

        <div className="tab-list">
          {listPosts.map((post) => (
            <Link key={post.id} href={`/${post.slug}`} className="tab-list-card">
              <div className="tab-list-thumb">
                <img
                  src={post.featured_image || "/api/placeholder/90/90"}
                  alt={post.title}
                  className="tab-thumb-img"
                  style={{ width: '100%', height: '100%' }}
                  loading="lazy"
                />
              </div>
              <div className="tab-list-body">
                <CategoryBadge name={post.categories?.name} color={post.categories?.color} size="xs" />
                <h4 className="tab-list-title">{post.title}</h4>
                <div className="tab-list-meta"></div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
