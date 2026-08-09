import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { PostEditorProvider } from "@/components/admin/editor/post-editor-provider"
import { PostEditorLayout } from "@/components/admin/editor/post-editor-layout"
import { EditorErrorBoundary } from "@/components/admin/editor/editor-error-boundary"

type Props = { params: { id: string } }

// Explicit column list — avoids `search_vector` (huge tsvector string) and
// any future non-serializable columns being shipped to the client.
const POST_FIELDS = [
  "id", "title", "slug", "excerpt", "content", "featured_image",
  "category_id", "subcategory_id", "author_id", "status",
  "is_featured", "is_breaking", "is_sponsored", "rss_source_url",
  "original_source_url", "ai_rewritten", "scheduled_at", "published_at",
  "views", "reading_time", "seo_title", "seo_description", "seo_keywords",
  "og_image", "canonical_url", "google_indexed", "tags", "series_id",
  "created_at", "updated_at", "quick_brief", "quality_score", "source_name",
  "focus_keyword", "seo_score", "schema_type", "schema_data", "og_title",
  "og_description", "twitter_title", "twitter_description", "twitter_image",
  "readability_score", "flesch_score", "secondary_keywords",
  "robots_noindex", "robots_nofollow", "breadcrumb_title", "post_format",
  "is_sticky", "enable_comments", "source_url", "faq", "content_fingerprint",
  "source_urls", "is_editors_pick", "key_points", "model_used",
] as const

export default async function EditPostPage({ params }: Props) {
  let post: unknown = null
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from("posts")
      .select(POST_FIELDS.join(", "))
      .eq("id", params.id)
      .single()
    post = data
  } catch {
    post = null
  }
  if (!post) notFound()

  return (
    <EditorErrorBoundary>
      <PostEditorProvider initialPost={post as any}>
        <PostEditorLayout />
      </PostEditorProvider>
    </EditorErrorBoundary>
  )
}
