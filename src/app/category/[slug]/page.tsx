import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
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
    .select("*, author:profiles(*)")
    .eq("status", "published")
    .eq("category_id", category.id)
    .order("published_at", { ascending: false })
    .limit(20)

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
            <div className="space-y-8">
              {posts.map((post) => (
                <Link key={post.id} href={`/${post.slug}`} className="flex gap-5 group">
                  <div
                    className="w-48 h-32 shrink-0 rounded-lg bg-cover bg-center"
                    style={{ backgroundImage: `url(${post.featured_image || "/api/placeholder/300/200"})` }}
                  />
                  <div className="flex-1 min-w-0">
                    <Badge variant="indigo" className="mb-2">{category.name}</Badge>
                    <h2 className="text-xl font-bold group-hover:text-brand-indigo transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.excerpt}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{(post as any).author?.full_name || "Blizine"}</span>
                      <span>·</span>
                      <span>{post.published_at ? formatDate(post.published_at) : ""}</span>
                      <span>·</span>
                      <span>{post.reading_time} min read</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No posts in this category yet.
            </div>
          )}
        </div>
        <div className="lg:col-span-1">
          <Sidebar />
        </div>
      </div>
    </div>
  )
}
