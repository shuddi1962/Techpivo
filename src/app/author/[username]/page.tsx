import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"

type Props = { params: { username: string } }

export default async function AuthorPage({ params }: Props) {
  const supabase = createClient()
  const { data: author } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", params.username)
    .single()

  if (!author) notFound()

  const { data: posts } = await supabase
    .from("posts")
    .select("*, category:categories(*)")
    .eq("status", "published")
    .eq("author_id", author.id)
    .order("published_at", { ascending: false })
    .limit(30)

  return (
    <div className="container py-6">
      <div className="max-w-4xl mx-auto mb-10">
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={author.avatar_url || ""} />
            <AvatarFallback className="text-2xl">{author.full_name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{author.full_name}</h1>
            <p className="text-muted-foreground">@{author.username}</p>
            {author.bio && <p className="text-muted-foreground mt-2">{author.bio}</p>}
            <Badge variant="secondary" className="mt-2">{author.role}</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-6">Articles ({posts?.length || 0})</h2>
        <div className="space-y-6">
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
            <p className="text-center py-12 text-muted-foreground">No articles published yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
