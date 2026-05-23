import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { ArrowRight } from "lucide-react"

type Props = { params: { slug: string } }

export default async function SeriesPage({ params }: Props) {
  const supabase = createClient()
  const { data: series } = await supabase
    .from("series")
    .select("*, category:categories(name, slug)")
    .eq("slug", params.slug)
    .single()

  if (!series) notFound()

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "published")
    .eq("series_id", series.id)
    .order("published_at", { ascending: true })

  return (
    <div className="container py-6">
      <div className="max-w-3xl mx-auto">
        <Badge variant="indigo" className="mb-3">
          {series.category?.name || "Series"}
        </Badge>
        <h1 className="text-4xl font-bold mb-4">{series.title}</h1>
        {series.description && <p className="text-lg text-muted-foreground mb-8">{series.description}</p>}

        <div className="space-y-4">
          {posts && posts.length > 0 ? (
            posts.map((post, i) => (
              <Link key={post.id} href={`/${post.slug}`} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors group">
                <span className="text-3xl font-black text-muted-foreground/30 w-12 shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold group-hover:text-brand-indigo transition-colors">{post.title}</h2>
                  <p className="text-sm text-muted-foreground">{post.published_at ? formatDate(post.published_at) : ""}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-brand-indigo transition-colors" />
              </Link>
            ))
          ) : (
            <p className="text-center py-12 text-muted-foreground">No posts in this series yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
