import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Sidebar } from "@/components/layout/sidebar"
import { formatDate, readingTime } from "@/lib/utils"
import { Clock, Eye, ExternalLink, Bookmark } from "lucide-react"
import type { Metadata } from "next"
import { ReadingProgress } from "@/components/post/reading-progress"
import { ShareButtons } from "@/components/social/share-buttons"
import { PostComments } from "@/components/post/post-comments"
import { SITE_URL } from "@/lib/constants"

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

  const [popularRes, categoriesRes, recentRes] = await Promise.all([
    supabase.from("posts").select("*").eq("status", "published").order("views", { ascending: false }).limit(5),
    supabase.from("categories").select("*").order("name"),
    supabase.from("posts").select("*").eq("status", "published").order("published_at", { ascending: false }).limit(5),
  ])

  await supabase.rpc("increment_post_views", { post_id: post.id })

  const quickBrief = (post as any).quick_brief
  const sourceUrl = post.rss_source_url || post.original_source_url
  const popularPosts = popularRes.data || []
  const sidebarCategories = categoriesRes.data || []
  const recentPosts = recentRes.data || []

  return (
    <>
      <ReadingProgress />

      {/* Hero Image */}
      <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${post.featured_image || "/api/placeholder/1200/600"})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      </div>

      <article className="container py-6 -mt-32 relative z-10">
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
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 drop-shadow-lg">
                {post.title}
              </h1>
              <p className="text-lg text-gray-300 mb-4">{post.excerpt}</p>

              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-white/20">
                    <AvatarImage src={(post as any).author?.avatar_url} />
                    <AvatarFallback>{(post as any).author?.full_name?.[0] || "B"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <Link href={`/author/${(post as any).author?.username}`} className="font-semibold text-white hover:text-brand-indigo">
                      {(post as any).author?.full_name || "Blizine"}
                    </Link>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
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
                  <button className="p-2 rounded-full hover:bg-white/10 transition-colors text-white" title="Save">
                    <Bookmark className="h-5 w-5" />
                  </button>
                  <ShareButtons
                    title={post.title}
                    url={`${SITE_URL}/${post.slug}`}
                    excerpt={post.excerpt}
                  />
                </div>
              </div>
            </div>

            <Separator className="mb-8" />

            {/* Quick Brief */}
            {quickBrief && (
              <div className="mb-8 p-4 rounded-lg bg-[#1a1a3e] border border-[#2a2a5e]">
                <h3 className="text-sm font-bold text-brand-amber uppercase tracking-wider mb-2">Quick Brief</h3>
                <p className="text-sm text-gray-300">{quickBrief}</p>
              </div>
            )}

            {/* Post Content */}
            <div
              className="prose prose-lg prose-invert max-w-none mb-8 prose-headings:text-white prose-a:text-brand-indigo prose-blockquote:border-brand-indigo prose-blockquote:text-gray-300 prose-strong:text-white prose-code:text-brand-amber"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {post.tags.map((tag: string) => (
                  <Link key={tag} href={`/tag/${tag}`}>
                    <Badge variant="secondary" className="cursor-pointer hover:bg-brand-indigo hover:text-white transition-colors">#{tag}</Badge>
                  </Link>
                ))}
              </div>
            )}

            {/* Source Attribution */}
            {sourceUrl && (
              <div className="mb-8 p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm text-muted-foreground">
                  Source:{" "}
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-indigo hover:underline inline-flex items-center gap-1"
                  >
                    {new URL(sourceUrl).hostname}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
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
              <div className="mb-8">
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

            {/* Comments */}
            <PostComments postId={post.id} />
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <Sidebar popularPosts={popularPosts} categories={sidebarCategories} recentPosts={recentPosts} />
            </div>
          </div>
        </div>
      </article>
    </>
  )
}
