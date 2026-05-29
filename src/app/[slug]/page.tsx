import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Sidebar } from "@/components/layout/Sidebar"
import { formatDate, formatDateFull, readingTime } from "@/lib/utils"
import { Clock, Eye, ArrowLeft, ExternalLink, Bookmark, ChevronRight } from "lucide-react"
import type { Metadata } from "next"
import { ReadingProgress } from "@/components/post/reading-progress"
import { ShareButtons } from "@/components/social/share-buttons"
import { PostComments } from "@/components/post/post-comments"
import { ViewTracker } from "@/components/post/view-tracker"
import { LiveViewCount } from "@/components/post/live-view-count"
import { SITE_URL } from "@/lib/constants"

export const dynamic = "force-dynamic"

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
    description: post.seo_description || post.content?.replace(/<[^>]+>/g,'').slice(0,155),
    openGraph: {
      title: post.title,
      description: post.seo_description || post.content?.replace(/<[^>]+>/g,'').slice(0,155),
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

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const [popularRes, categoriesRes, recentRes, trendingRes, tagsRes] = await Promise.all([
    supabase.from("posts").select("*").eq("status", "published").order("views", { ascending: false }).limit(5),
    supabase.from("categories").select("*").order("name"),
    supabase.from("posts").select("*").eq("status", "published").order("published_at", { ascending: false }).limit(5),
    supabase.from("posts").select("id,title,slug,views,categories(name,slug,color)").eq("status", "published").gte("published_at", sevenDaysAgo).order("views", { ascending: false }).limit(5),
    supabase.from("posts").select("seo_keywords").eq("status", "published").limit(100),
  ])

  const quickBrief = (post as any).quick_brief
  const keyPoints = (post as any).key_points
  const faq = (post as any).faq
  const sourceUrl = post.source_url || (post as any).original_source_url
  const sourceName = post.source_name
  const popularPosts = popularRes.data || []
  const sidebarCategories = categoriesRes.data || []
  const recentPosts = recentRes.data || []
  const trendingPosts = trendingRes.data || []
  const allTags = tagsRes.data || []
  const sidebarTags = Array.from(new Set(allTags.flatMap((p: any) => p.seo_keywords || []))).slice(0, 20) as string[]

  return (
    <>
      <ReadingProgress />
      <ViewTracker postId={post.id} />

      <article className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-3">
            {/* Back link */}
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>

            {/* Featured Image Card */}
            <div className="bg-card border rounded-2xl overflow-hidden mb-8 shadow-sm">
              <div className="relative w-full bg-muted max-h-72 md:max-h-96 overflow-hidden">
                <img
                  src={post.featured_image || "/api/placeholder/1200/600"}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-5 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Link href={`/category/${(post as any).category?.slug}`}>
                    <Badge variant="indigo" className="px-3 py-1 text-xs uppercase tracking-wider font-semibold">
                      {(post as any).category?.name}
                    </Badge>
                  </Link>
                  {post.is_sponsored && (
                    <Badge variant="amber" className="px-3 py-1 text-xs uppercase tracking-wider font-semibold">
                      Sponsored
                    </Badge>
                  )}
                </div>

                <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 text-foreground">
                  {post.title}
                </h1>

                <div className="flex items-center justify-between flex-wrap gap-4 pb-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 ring-2 ring-primary/20">
                      <AvatarImage src={(post as any).author?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {(post as any).author?.full_name?.[0] || "B"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Link
                        href={`/author/${(post as any).author?.username}`}
                        className="font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {(post as any).author?.full_name || "Blizine"}
                      </Link>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <time dateTime={post.published_at}>
                          {post.published_at ? formatDateFull(post.published_at) : ""}
                        </time>
                        <span className="text-muted-foreground/40">·</span>
                        <Clock className="h-3.5 w-3.5" />
                        <span>{post.reading_time || readingTime(post.content || "")} min read</span>
                        <span className="text-muted-foreground/40">·</span>
                        <Eye className="h-3.5 w-3.5" />
                        <LiveViewCount postId={post.id} initialViews={post.views || 0} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-2.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Save"
                    >
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
            </div>

            {/* Quick Brief */}
            {quickBrief && Array.isArray(quickBrief) && quickBrief.length > 0 && (
              <div className="quick-brief-widget">
                <div className="qb-header">
                  <span className="qb-icon">⚡</span>
                  <span className="qb-title">Quick Brief</span>
                </div>
                <ul className="qb-list">
                  {quickBrief.map((point: string, i: number) => (
                    <li key={i} className="qb-item">{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Key Points */}
            {keyPoints && Array.isArray(keyPoints) && keyPoints.length > 0 && (
              <div className="key-points-widget">
                <div className="kp-header">
                  <span className="kp-icon">📌</span>
                  <span className="kp-title">Key Points</span>
                </div>
                <div className="kp-list">
                  {keyPoints.map((point: string, i: number) => (
                    <div key={i} className="kp-item">
                      <span className="kp-bullet">{i + 1}</span>
                      {point}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Post Content */}
            <div className="mb-10">
              <div
                className="article-content prose prose-lg max-w-none
                  prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight
                  prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-5
                  prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
                  prose-p:text-[17px] prose-p:leading-[1.8] prose-p:text-foreground/90 prose-p:mb-5
                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:py-2 prose-blockquote:px-5 prose-blockquote:rounded-r-lg prose-blockquote:text-foreground/80 prose-blockquote:italic
                  prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal
                  prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-border prose-pre:rounded-xl
                  prose-img:rounded-xl prose-img:shadow-lg
                  prose-li:text-[17px] prose-li:leading-[1.8] prose-li:text-foreground/90
                  prose-hr:border-border"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </div>

            {/* FAQ */}
            {faq && Array.isArray(faq) && faq.length > 0 && (
              <div className="faq-widget">
                <h3 className="faq-title">
                  <span className="faq-icon">❓</span>
                  Frequently Asked Questions
                </h3>
                <div className="faq-list">
                  {faq.map((item: { question: string; answer: string }, i: number) => (
                    <details key={i} className="faq-item">
                      <summary className="faq-question">{item.question}</summary>
                      <div className="faq-answer">{item.answer}</div>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {post.tags.map((tag: string) => (
                  <Link key={tag} href={`/tag/${tag}`}>
                    <Badge
                      variant="secondary"
                      className="px-3 py-1.5 text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                    >
                      #{tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            {/* Source Attribution */}
            {sourceUrl && (
              <div className="mb-8 p-5 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="text-lg">📰</span>
                  {sourceName ? `${sourceName} — ` : "Originally published at "}
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    {new URL(sourceUrl).hostname.replace("www.", "")}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </p>
              </div>
            )}

            {/* Author Bio */}
            <div className="bg-gradient-to-br from-muted to-muted/50 rounded-2xl p-6 md:p-8 mb-8 border border-border">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <Avatar className="h-16 w-16 ring-2 ring-primary/20 shrink-0">
                  <AvatarImage src={(post as any).author?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                    {(post as any).author?.full_name?.[0] || "B"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <Link
                        href={`/author/${(post as any).author?.username}`}
                        className="font-bold text-lg text-foreground hover:text-primary transition-colors"
                      >
                        {(post as any).author?.full_name || "Blizine"}
                      </Link>
                      <p className="text-sm text-muted-foreground mt-0.5">Staff Writer</p>
                    </div>
                    <Link
                      href={`/author/${(post as any).author?.username}`}
                      className="inline-flex items-center gap-1 text-sm text-primary font-medium hover:underline"
                    >
                      View Profile <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  {(post as any).author?.bio && (
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                      {(post as any).author?.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator className="mb-8" />

            {/* Related Posts */}
            {relatedPosts && relatedPosts.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-2">
                  Related Articles
                  <span className="h-0.5 flex-1 bg-border rounded-full" />
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {relatedPosts.map((rel) => (
                    <Link key={rel.id} href={`/${rel.slug}`} className="group block">
                      <div className="relative rounded-xl overflow-hidden h-44 mb-3 bg-muted">
                        <div
                          className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                          style={{ backgroundImage: `url(${rel.featured_image || "/api/placeholder/400/250"})` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      <h3 className="font-semibold text-[15px] leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {rel.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                        {rel.published_at ? formatDate(rel.published_at) : ""}
                        <span className="text-muted-foreground/40">·</span>
                        <Clock className="h-3 w-3" />
                        {rel.reading_time || readingTime(rel.content || "")} min read
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="mt-4">
              <PostComments postId={post.id} />
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Sidebar trending={trendingPosts} popular={popularPosts} categories={sidebarCategories} tags={sidebarTags} />
            </div>
          </div>
        </div>
      </article>
    </>
  )
}
