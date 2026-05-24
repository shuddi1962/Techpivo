import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { PostCard } from "@/components/post/post-card"
import { Sidebar } from "@/components/layout/sidebar"
import { formatDate } from "@/lib/utils"
import type { Metadata } from "next"

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()
  const { data: cat } = await supabase.from("categories").select("*").eq("slug", params.slug).single()
  if (!cat) return { title: "Category Not Found" }
  return {
    title: cat.meta_title || cat.name,
    description: cat.meta_description || `${cat.name} - Blizine`,
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

  const { data: posts } = await supabase
    .from("posts")
    .select("*, category:categories(*), author:profiles(*)")
    .eq("status", "published")
    .eq("category_id", category.id)
    .order("published_at", { ascending: false })
    .limit(20)

  const { data: popularPosts } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "published")
    .order("views", { ascending: false })
    .limit(5)

  const { data: allCategories } = await supabase
    .from("categories")
    .select("*")
    .order("name")

  const { data: recentPosts } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(5)

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

      {/* Ad Banner */}
      <div className="ad-container min-h-[90px] mb-8 rounded-lg">
        <span className="ad-label">Advertisement</span>
        <p className="text-xs text-muted-foreground">728 × 90</p>
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
            popularPosts={popularPosts || []}
            categories={allCategories || []}
            recentPosts={recentPosts || []}
          />
        </div>
      </div>
    </div>
  )
}
