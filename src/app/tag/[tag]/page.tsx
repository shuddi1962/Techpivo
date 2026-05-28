import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"

type Props = { params: { tag: string } }

export default async function TagPage({ params }: Props) {
  const supabase = createClient()
  const { data: posts } = await supabase
    .from("posts")
    .select("*, author:profiles(*), category:categories(*)")
    .eq("status", "published")
    .contains("tags", [params.tag])
    .order("published_at", { ascending: false })
    .limit(50)

  return (
    <div className="container py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">#{params.tag}</h1>
        <p className="text-muted-foreground mt-1">{posts?.length || 0} article{(posts?.length || 0) !== 1 ? "s" : ""}</p>
      </div>

      <div className="space-y-6 max-w-4xl">
        {posts && posts.length > 0 ? posts.map((post) => (
          <Link key={post.id} href={`/${post.slug}`} className="flex gap-4 group">
            <div className="w-32 h-24 shrink-0 rounded-lg bg-cover bg-center"
              style={{ backgroundImage: `url(${post.featured_image || "/api/placeholder/200/150"})` }} />
            <div className="flex-1 min-w-0">
              <Badge variant="indigo" className="mb-1">{(post as any).category?.name}</Badge>
              <h2 className="font-semibold group-hover:text-brand-amber line-clamp-2">{post.title}</h2>
              <p className="text-sm text-muted-foreground line-clamp-1">{post.excerpt}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {post.published_at ? formatDate(post.published_at) : ""} · {post.reading_time} min read
              </p>
            </div>
          </Link>
        )) : (
          <p className="text-center py-12 text-muted-foreground">No articles found with this tag.</p>
        )}
      </div>
    </div>
  )
}
