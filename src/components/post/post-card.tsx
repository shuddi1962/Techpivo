import Link from "next/link"

interface PostCardPost {
  title: string
  slug: string
  excerpt: string
  featured_image: string
  category: { name: string } | null
  author: { full_name: string } | null
  published_at: string | null
  reading_time: number
  views: number
}

interface PostCardProps {
  post: PostCardPost
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Link href={`/${post.slug}`} className="post-card group" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      <div className="relative aspect-[16/9] overflow-hidden">
        <img src={post.featured_image || "/api/placeholder/400/225"} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
        <span className="absolute top-3 left-3 px-2 py-1 text-xs font-medium rounded" style={{ background: "rgba(245,158,11,0.2)", color: "#F59E0B" }}>{post.category?.name || "Tech"}</span>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold line-clamp-2 group-hover:text-[#F59E0B] transition-colors mb-2" style={{ color: "var(--text)" }}>{post.title}</h3>
        <p className="text-sm line-clamp-2 mb-3" style={{ color: "var(--muted)" }}>{post.excerpt}</p>
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ background: "#F59E0B" }}>{post.author?.full_name?.[0] || "T"}</span>
          <span>{post.author?.full_name || "Techpivo"}</span>
        </div>
      </div>
    </Link>
  )
}
