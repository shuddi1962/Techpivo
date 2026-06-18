import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Sidebar } from "@/components/layout/Sidebar"
import { formatDate } from "@/lib/utils"
import { SITE_NAME, SITE_URL } from "@/lib/constants"
import type { Metadata } from "next"

type Props = { params: { slug: string; subcategory: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()
  const { data: cat } = await supabase.from("categories").select("*").eq("slug", params.slug).single()
  const { data: sub } = await supabase.from("subcategories").select("*").eq("slug", params.subcategory).eq("category_id", cat?.id || 0).single()
  if (!sub) return { title: "Subcategory Not Found" }
  return {
    title: sub.name,
    description: `${sub.name} - ${SITE_NAME}`,
    alternates: { canonical: `${SITE_URL}/category/${params.slug}/${params.subcategory}` },
  }
}

export default async function SubcategoryPage({ params }: Props) {
  const supabase = createClient()
  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", params.slug)
    .single()

  if (!category) notFound()

  const { data: subcategory } = await supabase
    .from("subcategories")
    .select("*")
    .eq("slug", params.subcategory)
    .eq("category_id", category.id)
    .single()

  if (!subcategory) notFound()

  const { data: posts, count } = await supabase
    .from("posts")
    .select("*, author:profiles(*)", { count: "exact", head: false })
    .eq("status", "published")
    .eq("subcategory_id", subcategory.id)
    .order("published_at", { ascending: false })
    .limit(20)

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const [popularRes, categoriesRes, recentRes, trendingRes, tagsRes] = await Promise.all([
    supabase.from("posts").select("*").eq("status", "published").order("views", { ascending: false }).limit(5),
    supabase.from("categories").select("*").order("name"),
    supabase.from("posts").select("*").eq("status", "published").order("published_at", { ascending: false }).limit(5),
    supabase.from("posts").select("id,title,slug,views,categories(name,slug,color)").eq("status", "published").gte("published_at", sevenDaysAgo).order("views", { ascending: false }).limit(5),
    supabase.from("posts").select("seo_keywords").eq("status", "published").limit(100),
  ])

  const popularPosts = popularRes.data || []
  const sidebarCategories = categoriesRes.data || []
  const recentPosts = recentRes.data || []
  const trendingPosts = trendingRes.data || []
  const allTags = tagsRes.data || []
  const sidebarTags = Array.from(new Set(allTags.flatMap((p: any) => p.seo_keywords || []))).slice(0, 20) as string[]

  return (
    <div className="container py-6">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href={`/category/${category.slug}`} className="hover:text-brand-amber">{category.name}</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{subcategory.name}</span>
        </div>
        <h1 className="text-3xl font-bold">{subcategory.name}</h1>
        {subcategory.description && <p className="text-muted-foreground mt-2">{subcategory.description}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          {posts && posts.length > 0 ? posts.map((post) => (
            <Link key={post.id} href={`/${post.slug}`} className="flex gap-5 group">
              <div className="w-48 h-32 shrink-0 rounded-lg bg-cover bg-center"
                style={{ backgroundImage: `url(${post.featured_image || "/api/placeholder/300/200"})` }} />
              <div className="flex-1 min-w-0">
                <Badge variant="indigo" className="mb-2">{category.name}</Badge>
                <h2 className="text-xl font-bold group-hover:text-brand-amber transition-colors line-clamp-2">{post.title}</h2>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.excerpt}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span>{(post as any).author?.full_name || "Techpivo"}</span>
                  <span>·</span>
                  <span>{post.published_at ? formatDate(post.published_at) : ""}</span>
                  <span>·</span>
                  <span>{post.reading_time} min read</span>
                </div>
              </div>
            </Link>
          )) : (
            <div className="text-center py-12 text-muted-foreground">No posts found.</div>
          )}
        </div>
        <div className="lg:col-span-1"><Sidebar trending={trendingPosts} popular={popularPosts} categories={sidebarCategories} tags={sidebarTags} /></div>
      </div>
    </div>
  )
}
