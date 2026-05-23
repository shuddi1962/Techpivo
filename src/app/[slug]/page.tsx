import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Sidebar } from "@/components/layout/sidebar"
import { formatDate, readingTime } from "@/lib/utils"
import { Share2, Bookmark, Clock, Eye } from "lucide-react"
import type { Metadata } from "next"

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()
  const { data: post } = await supabase
    .from("posts")
    .select("*, category:categories(*)")
    .eq("slug", params.slug)
    .eq("status", "published")
    .single()

  if (!post) return { title: "Post Not Found" }

  return {
    title: post.seo_title || post.title,
    description: post.seo_description || post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.og_image || post.featured_image ? [{ url: post.og_image || post.featured_image || "" }] : [],
    },
  }
}

export default async function PostPage({ params }: Props) {
  const supabase = createClient()
  const { data: post } = await supabase
    .from("posts")
    .select("*, category:categories(*), author:profiles(*)")
    .eq("slug", params.slug)
    .eq("status", "published")
    .single()

  if (!post) notFound()

  const { data: relatedPosts } = await supabase
    .from("posts")
    .select("*, author:profiles(*)")
    .eq("status", "published")
    .eq("category_id", post.category_id)
    .neq("id", post.id)
    .order("published_at", { ascending: false })
    .limit(3)

  // Increment view count
  await supabase.rpc("increment_post_views", { post_id: post.id })

  return (
    <article className="container py-6">
      {/* Hero Image */}
      {post.featured_image && (
        <div className="w-full h-[400px] md:h-[500px] rounded-xl overflow-hidden mb-8 bg-cover bg-center"
          style={{ backgroundImage: `url(${post.featured_image})` }} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          {/* Post Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Link href={`/category/${(post as any).category?.slug}`}>
                <Badge variant="indigo">{(post as any).category?.name}</Badge>
              </Link>
              {post.is_sponsored && <Badge variant="amber">Sponsored</Badge>}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{post.title}</h1>
            <p className="text-lg text-muted-foreground mb-4">{post.excerpt}</p>
            
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={(post as any).author?.avatar_url} />
                  <AvatarFallback>{(post as any).author?.full_name?.[0] || "B"}</AvatarFallback>
                </Avatar>
                <div>
                  <Link href={`/author/${(post as any).author?.username}`} className="font-semibold hover:text-brand-indigo">
                    {(post as any).author?.full_name || "Blizine"}
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{post.published_at ? formatDate(post.published_at) : ""}</span>
                    <span>·</span>
                    <Clock className="h-3 w-3" />
                    <span>{post.reading_time} min read</span>
                    <span>·</span>
                    <Eye className="h-3 w-3" />
                    <span>{post.views} views</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-full hover:bg-muted transition-colors" title="Save">
                  <Bookmark className="h-5 w-5" />
                </button>
                <button className="p-2 rounded-full hover:bg-muted transition-colors" title="Share">
                  <Share2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <Separator className="mb-8" />

          {/* Ad - Post Top */}
          <div className="ad-container min-h-[90px] mb-8 rounded-lg">
            <span className="ad-label">Advertisement</span>
            <p className="text-xs text-muted-foreground">728 × 90</p>
          </div>

          {/* Post Content */}
          <div
            className="prose-custom mb-8"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {post.tags.map((tag: string) => (
                <Link key={tag} href={`/tag/${tag}`}>
                  <Badge variant="secondary" className="cursor-pointer">#{tag}</Badge>
                </Link>
              ))}
            </div>
          )}

          {/* Author Bio */}
          <div className="bg-muted rounded-xl p-6 mb-8">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={(post as any).author?.avatar_url} />
                <AvatarFallback>{(post as any).author?.full_name?.[0] || "B"}</AvatarFallback>
              </Avatar>
              <div>
                <Link href={`/author/${(post as any).author?.username}`} className="font-bold text-lg hover:text-brand-indigo">
                  {(post as any).author?.full_name || "Blizine"}
                </Link>
                {(post as any).author?.bio && (
                  <p className="text-sm text-muted-foreground mt-1">{(post as any).author?.bio}</p>
                )}
              </div>
            </div>
          </div>

          {/* Related Posts */}
          {relatedPosts && relatedPosts.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map((rel) => (
                  <Link key={rel.id} href={`/${rel.slug}`} className="group">
                    <div className="rounded-lg overflow-hidden h-36 bg-cover bg-center mb-3"
                      style={{ backgroundImage: `url(${rel.featured_image || "/api/placeholder/400/250"})` }} />
                    <h3 className="font-semibold group-hover:text-brand-indigo line-clamp-2">{rel.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {rel.published_at ? formatDate(rel.published_at) : ""} · {rel.reading_time} min read
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <Sidebar />
          </div>
        </div>
      </div>
    </article>
  )
}
