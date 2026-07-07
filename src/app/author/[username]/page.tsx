import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { SITE_NAME, SITE_URL } from "@/lib/constants"
import { JsonLd } from "@/components/ui/jsonld"
import { breadcrumbSchema, profilePageSchema } from "@/lib/jsonld"
import type { Metadata } from "next"

type Props = { params: { username: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()
  const { data: author } = await supabase.from("profiles").select("full_name, bio, id").eq("username", params.username).single()
  if (!author) return { title: "Author Not Found" }

  const { count } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("status", "published")
    .eq("author_id", author.id)

  const hasBio = author.bio && author.bio.length > 20
  const thinProfile = !hasBio || !count || count < 2

  return {
    title: `${author.full_name} - ${SITE_NAME}`,
    description: author.bio || `${author.full_name} - ${SITE_NAME} author`,
    alternates: { canonical: `${SITE_URL}/author/${params.username}` },
    robots: thinProfile ? { index: false, follow: true } : { index: true, follow: true },
  }
}

export default async function AuthorPage({ params }: Props) {
  const supabase = createClient()
  const { data: author } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", params.username)
    .single()

  if (!author) notFound()

  const { data: posts, count } = await supabase
    .from("posts")
    .select("*, category:categories(*)", { count: "exact", head: false })
    .eq("status", "published")
    .eq("author_id", author.id)
    .order("published_at", { ascending: false })
    .limit(30)

  if (!count || count === 0) notFound()

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: `Author: ${author.full_name}` },
      ])} />
      <JsonLd data={profilePageSchema(author)} />
      <div className="container py-6">
      <div className="max-w-6xl mx-auto mb-10">
        <div>
          <h1 className="text-3xl font-bold">{author.full_name}</h1>
          <p className="text-muted-foreground">@{author.username}</p>
          {author.bio && <p className="text-muted-foreground mt-2">{author.bio}</p>}
          <Badge variant="secondary" className="mt-2">{author.role}</Badge>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl font-bold mb-6">Articles ({posts?.length || 0})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts && posts.length > 0 ? posts.map((post) => (
            <Link key={post.id} href={`/${post.slug}`} className="group border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-48 bg-cover bg-center"
                style={{ backgroundImage: `url(${post.featured_image || "/api/placeholder/400/250"})` }} />
              <div className="p-4">
                <Badge variant="indigo" className="mb-2">{(post as any).category?.name}</Badge>
                <h2 className="font-semibold group-hover:text-brand-amber line-clamp-2">{post.title}</h2>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.excerpt}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {post.published_at ? formatDate(post.published_at) : ""} · {post.reading_time} min read
                </p>
              </div>
            </Link>
          )) : (
            <p className="text-center py-12 text-muted-foreground col-span-full">No articles published yet.</p>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
