import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"

type Props = { params: { slug: string } }

export default async function PreviewPage({ params }: Props) {
  const supabase = createClient()
  const { data: post } = await supabase
    .from("posts")
    .select("*, category:categories(name)")
    .eq("slug", params.slug)
    .single()

  if (!post) {
    const { data: draft } = await supabase
      .from("preview_drafts")
      .select("*")
      .eq("slug", params.slug)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (draft) {
      return (
        <div className="min-h-screen bg-[#0A0F1E]">
          <div className="max-w-3xl mx-auto px-4 py-24">
            <div className="flex items-center justify-between mb-8">
              <Link href="/" className="text-2xl font-bold text-[#F9FAFB]">BLIZ9INE</Link>
              <span className="text-xs text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-1 rounded">PREVIEW</span>
            </div>
            <article className="prose prose-invert max-w-none">
              <h1>{draft.title}</h1>
              {draft.featured_image && (
                <img src={draft.featured_image} alt="" className="w-full rounded-lg" />
              )}
              <div dangerouslySetInnerHTML={{ __html: draft.content || "" }} />
            </article>
          </div>
        </div>
      )
    }
    notFound()
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      <div className="max-w-3xl mx-auto px-4 py-24">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-2xl font-bold text-[#F9FAFB]">BLIZ9INE</Link>
          <span className="text-xs text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-1 rounded">PREVIEW</span>
        </div>
        <article className="prose prose-invert max-w-none">
          <h1>{post.title}</h1>
          {post.featured_image && (
            <img src={post.featured_image} alt="" className="w-full rounded-lg" />
          )}
          <div className="text-sm text-[#9CA3AF] mb-8">
            {post.category?.name && <span>{post.category.name} • </span>}
            {post.reading_time} min read
          </div>
          <div dangerouslySetInnerHTML={{ __html: post.content || "" }} />
        </article>
      </div>
    </div>
  )
}
