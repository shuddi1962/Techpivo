import Link from "next/link"
import { CategoryBadge } from "@/components/ui/CategoryBadge"

export function LatestGrid({ posts }: { posts: any[] }) {
  if (!posts.length) return null
  return (
    <section className="latest-section">
      <div className="section-head">
        <h2 className="section-title">
          <span className="sec-gem">◈</span>
          Latest Articles
        </h2>
        <Link href="/latest" className="view-all-link">View all</Link>
      </div>

      <div className="latest-grid">
        {posts.slice(0, 6).map((post) => (
          <Link key={post.id} href={`/${post.slug}`} className="post-card">
            <div className="post-card-img-wrap">
              <img
                src={post.featured_image || "/api/placeholder/400/225"}
                alt={post.title}
                className="post-card-img"
                style={{ width: '100%', height: '100%' }}
                loading="lazy"
              />
              <div className="post-card-img-overlay" />
              <div className="post-card-img-top">
                <CategoryBadge name={post.categories?.name} color={post.categories?.color} size="xs" />
              </div>
            </div>
            <div className="post-card-body">
              <h3 className="post-card-title">{post.title}</h3>
              <div className="post-card-meta"></div>
            </div>
          </Link>
        ))}
      </div>

      <div className="load-more-wrap">
        <Link href="/latest" className="load-more-btn">Load More Articles</Link>
      </div>
    </section>
  )
}
