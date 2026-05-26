import Link from "next/link"
import Image from "next/image"
import { CategoryBadge } from "@/components/ui/CategoryBadge"

export function PopularWidget({ posts }: { posts: any[] }) {
  if (!posts.length) return null
  return (
    <div className="sidebar-card">
      <div className="sidebar-card-header">
        <span className="sidebar-card-icon">◈</span>
        <span className="sidebar-card-title">Popular This Week</span>
      </div>
      <ul className="popular-list">
        {posts.slice(0, 5).map((post) => (
          <li key={post.id} className="popular-item">
            <Image
              src={post.featured_image || "/placeholder.jpg"}
              alt={post.title}
              width={64}
              height={48}
              className="popular-thumb"
            />
            <div className="popular-info">
              <Link href={`/${post.slug}`} className="popular-title">{post.title}</Link>
              <div className="popular-meta">
                <CategoryBadge name={post.categories?.name} color={post.categories?.color} size="xs" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
