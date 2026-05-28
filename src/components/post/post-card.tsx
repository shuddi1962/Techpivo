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
    <Link href={`/${post.slug}`} className="group block rounded-lg border border-[#333333] bg-[#1a1a1a] overflow-hidden hover:border-[#F59E0B] hover:-translate-y-0.5 transition-all duration-200">
      <div className="relative aspect-[16/9] overflow-hidden">
        <img src={post.featured_image || "/api/placeholder/400/225"} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
        <span className="absolute top-3 left-3 px-2 py-1 text-xs font-medium rounded bg-[#F59E0B]/20 text-[#F59E0B]">{post.category?.name || "Tech"}</span>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-[#e5e5e5] line-clamp-2 group-hover:text-[#F59E0B] transition-colors mb-2">{post.title}</h3>
        <p className="text-sm text-[#9ca3af] line-clamp-2 mb-3">{post.excerpt}</p>
        <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
          <span className="w-6 h-6 rounded-full bg-[#F59E0B] flex items-center justify-center text-white text-[10px] font-bold">{post.author?.full_name?.[0] || "B"}</span>
          <span>{post.author?.full_name || "Blizine"}</span>
        </div>
      </div>
    </Link>
  )
}
