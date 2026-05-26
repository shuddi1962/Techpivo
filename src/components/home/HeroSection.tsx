"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect, useCallback } from "react"
import { CategoryBadge } from "@/components/ui/CategoryBadge"

interface HeroSectionProps {
  featured: any
  secondary: any[]
}

export function HeroSection({ featured, secondary }: HeroSectionProps) {
  const allPosts = [featured, ...secondary].filter(Boolean)
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => {
    setCurrent(c => (c + 1) % allPosts.length)
  }, [allPosts.length])

  useEffect(() => {
    if (allPosts.length < 2) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [next, allPosts.length])

  if (!allPosts.length) return null

  const post = allPosts[current]
  const others = allPosts.filter((_, i) => i !== current)

  return (
    <section className="hero-section">
      <div className="hero-grid">
        <Link href={`/${post.slug}`} className="hero-main">
          <div className="hero-main-img">
            <Image
              src={post.featured_image || "/placeholder.jpg"}
              alt={post.title}
              fill
              className="hero-img"
              sizes="(max-width: 768px) 100vw, 60vw"
              priority
            />
            <div className="hero-main-overlay" />
          </div>
          {post.is_breaking && (
            <span className="hero-badge-breaking">BREAKING</span>
          )}
          <div className="hero-main-content">
            <CategoryBadge name={post.categories?.name} color={post.categories?.color} size="sm" />
            <h1 className="hero-main-title">{post.title}</h1>
            <p className="hero-main-excerpt">{post.excerpt}</p>
          </div>
        </Link>

        <div className="hero-secondary">
          {others.slice(0, 2).map((p) => (
            <Link key={p.id} href={`/${p.slug}`} className="hero-sec-card">
              <div className="hero-sec-img-wrap">
                <Image
                  src={p.featured_image || "/placeholder.jpg"}
                  alt={p.title}
                  fill
                  className="hero-sec-img"
                  sizes="120px"
                />
              </div>
              <div className="hero-sec-body">
                <CategoryBadge name={p.categories?.name} color={p.categories?.color} size="xs" />
                <h3 className="hero-sec-title">{p.title}</h3>
                <div style={{ fontSize: 11, color: "var(--muted2)" }}></div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      {allPosts.length > 1 && (
        <div className="hero-dots">
          {allPosts.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`hero-dot${i === current ? " active" : ""}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
