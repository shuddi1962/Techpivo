import Link from "next/link"
import { CategoryBadge } from "@/components/ui/CategoryBadge"

export function EditorialSection({ posts }: { posts: any[] }) {
  if (!posts.length) return null
  return (
    <section className="cat-strip">
      <div className="section-head">
        <h2 className="section-title">
          <span className="sec-gem">◈</span>
          Editor&apos;s Picks
        </h2>
        <Link href="/editors-picks" className="view-all-link">View all</Link>
      </div>

      <div className="cat-strip-grid">
        {posts.slice(0, 4).map((post) => (
          <Link key={post.id} href={`/${post.slug}`} className="cat-strip-card">
            <div className="cat-strip-img-wrap">
              <img
                src={post.featured_image || "/api/placeholder/400/225"}
                alt={post.title}
                className="cat-strip-img"
                style={{ width: '100%', height: '100%' }}
                loading="lazy"
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
