import Link from "next/link"
import type { Post, Category } from "@/types/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"

interface SidebarProps {
  popularPosts: Post[]
  categories: Category[]
  recentPosts: Post[]
}

export function Sidebar({ popularPosts, categories, recentPosts }: SidebarProps) {
  return (
    <aside className="space-y-6">
      {/* Newsletter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stay Connected</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Get the latest tech news delivered to your inbox.
          </p>
          <form action="#" method="POST" className="flex gap-2">
            <input
              type="email"
              name="email"
              placeholder="your@email.com"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-3"
            >
              Go
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Popular Posts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Popular This Week</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {popularPosts.map((post, i) => (
            <Link key={post.id} href={`/${post.slug}`} className="flex gap-3 group">
              <span className="text-2xl font-black text-muted-foreground/30 w-8 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h4 className="text-sm font-medium line-clamp-2 group-hover:text-brand-indigo transition-colors">
                  {post.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {post.published_at ? formatDate(post.published_at) : ""}
                </p>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Recent Posts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Posts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentPosts.map((post) => (
            <Link key={post.id} href={`/${post.slug}`} className="flex gap-3 group">
              <div
                className="w-16 h-16 shrink-0 rounded-lg bg-cover bg-center"
                style={{ backgroundImage: `url(${post.featured_image || "/api/placeholder/80/80"})` }}
              />
              <div>
                <h4 className="text-sm font-medium line-clamp-2 group-hover:text-brand-indigo transition-colors">
                  {post.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {post.published_at ? formatDate(post.published_at) : ""}
                </p>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Categories</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/category/${cat.slug}`}>
              <Badge variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
                {cat.name}
              </Badge>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Ad Slot */}
      <div className="ad-container min-h-[250px]">
        <span className="ad-label">Advertisement</span>
        <p className="text-xs text-muted-foreground">300 × 250</p>
      </div>
    </aside>
  )
}
