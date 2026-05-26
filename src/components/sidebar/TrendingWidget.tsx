import Link from "next/link"
import { CategoryBadge } from "@/components/ui/CategoryBadge"

export function TrendingWidget({ posts }: { posts: any[] }) {
  if (!posts.length) return null
  return (
    <div className="sidebar-card">
      <div className="sidebar-card-header">
        <span className="sidebar-card-icon">◈</span>
        <span className="sidebar-card-title">Trending Now</span>
      </div>
      <ul className="trending-list">
        {posts.map((post, i) => (
          <li key={post.id} className="trending-item">
            <span className={`trending-rank${i < 3 ? [" gold", " silver", " bronze"][i] : ""}`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="trending-content">
              <Link href={`/${post.slug}`} className="trending-title">{post.title}</Link>
              <div className="trending-meta">
                <CategoryBadge name={post.categories?.name} color={post.categories?.color} size="xs" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
