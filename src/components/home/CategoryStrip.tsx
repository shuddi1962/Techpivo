"use client"

import Link from "next/link"
import Image from "next/image"
import { CategoryBadge } from "@/components/ui/CategoryBadge"

interface CategoryStripProps {
  categoryName: string
  categorySlug: string
  categoryColor: string
  posts: any[]
  subcategories?: any[]
}

export function CategoryStrip({ categoryName, categorySlug, categoryColor, posts, subcategories }: CategoryStripProps) {
  if (!posts.length) return null
  return (
    <section className="cat-strip">
      <div className="section-head">
        <h2 className="section-title">
          <span className="sec-gem">◈</span>
          {categoryName}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {subcategories && subcategories.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {subcategories.slice(0, 4).map((sub: any) => (
                <a key={sub.id} href={`/category/${categorySlug}/${sub.slug}`}
                  style={{
                    fontSize: 11, color: "var(--muted2)", background: "var(--bg)",
                    padding: "2px 10px", borderRadius: 12, textDecoration: "none",
                    border: "1px solid var(--border)", transition: "color .2s, border-color .2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "var(--accent)" }}
                  onMouseLeave={e => { e.currentTarget.style.color = "var(--muted2)"; e.currentTarget.style.borderColor = "var(--border)" }}
                >
                  {sub.name}
                </a>
              ))}
            </div>
          )}
          <Link href={`/category/${categorySlug}`} className="view-all-link">View all</Link>
        </div>
      </div>

      <div className="cat-strip-grid" style={{ "--cat-color": categoryColor || "var(--accent)" } as React.CSSProperties}>
        {posts.slice(0, 4).map((post) => (
          <Link key={post.id} href={`/${post.slug}`} className="cat-strip-card">
            <div className="cat-strip-img-wrap">
              <Image
                src={post.featured_image || "/placeholder.jpg"}
                alt={post.title}
                fill
                className="cat-strip-img"
                sizes="25vw"
              />
              <div className="cat-strip-grad" />
            </div>
            <div className="cat-strip-body">
              <CategoryBadge name={post.categories?.name} color={post.categories?.color} size="xs" />
              <h3 className="cat-strip-title">{post.title}</h3>
              <div className="cat-strip-meta"></div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
