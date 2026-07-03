import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { PostCard } from "@/components/post/post-card"
import { Sidebar } from "@/components/layout/Sidebar"
import { formatDate } from "@/lib/utils"
import { SITE_NAME, SITE_URL } from "@/lib/constants"
import type { Metadata } from "next"

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()
  const { data: cat } = await supabase.from("categories").select("*").eq("slug", params.slug).single()
  if (!cat) return { title: "Category Not Found" }

  const { count } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("status", "published")
    .eq("category_id", cat.id)

  const hasDescription = cat.description && cat.description.length > 30
  const thinCategory = !hasDescription && (!count || count < 5)

  return {
    title: cat.meta_title || cat.name,
    description: cat.meta_description || `${cat.name} - ${SITE_NAME}`,
    alternates: { canonical: `${SITE_URL}/category/${cat.slug}` },
    robots: thinCategory ? { index: false, follow: true } : { index: true, follow: true },
  }
}

export default async function CategoryPage({ params }: Props) {
  const supabase = createClient()
  const { data: category } = await supabase
    .from("categories")
    .select("*, subcategories(*)")
    .eq("slug", params.slug)
    .single()

  if (!category) notFound()

  const { data: posts, count } = await supabase
    .from("posts")
    .select("*, category:categories(*), author:profiles(*)", { count: "exact", head: false })
    .eq("status", "published")
    .eq("category_id", category.id)
    .order("published_at", { ascending: false })
    .limit(20)

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const [popularRes, allCategoriesRes, recentRes, trendingRes, tagsRes] = await Promise.all([
    supabase.from("posts").select("*").eq("status", "published").order("views", { ascending: false }).limit(5),
    supabase.from("categories").select("*").order("name"),
    supabase.from("posts").select("*").eq("status", "published").order("published_at", { ascending: false }).limit(5),
    supabase.from("posts").select("id,title,slug,views,categories(name,slug,color)").eq("status", "published").gte("published_at", sevenDaysAgo).order("views", { ascending: false }).limit(5),
    supabase.from("posts").select("seo_keywords").eq("status", "published").limit(100),
  ])

  const popularPosts = popularRes.data || []
  const allCategories = allCategoriesRes.data || []
  const recentPosts = recentRes.data || []
  const trendingPosts = trendingRes.data || []
  const allTags = tagsRes.data || []
  const sidebarTags = Array.from(new Set(allTags.flatMap((p: any) => p.seo_keywords || []))).slice(0, 20) as string[]

  return (
    <div className="container py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground">{category.description}</p>
        )}
        {category.subcategories && category.subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {category.subcategories.map((sub: any) => (
              <Link key={sub.id} href={`/category/${category.slug}/${sub.slug}`}>
                <Badge variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
                  {sub.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          {posts && posts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {posts.map((post) => (
                <PostCard key={post.id} post={post as any} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No posts in this category yet.
            </div>
          )}
        </div>
        <div className="lg:col-span-1">
          <Sidebar
            trending={trendingPosts}
            popular={popularPosts || []}
            categories={allCategories || []}
            tags={sidebarTags}
          />
        </div>
      </div>
    </div>
  )
}
