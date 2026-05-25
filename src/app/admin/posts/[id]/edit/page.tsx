import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { PostEditorProvider } from "@/components/admin/editor/post-editor-provider"
import { PostEditorLayout } from "@/components/admin/editor/post-editor-layout"

type Props = { params: { id: string } }

export default async function EditPostPage({ params }: Props) {
  const supabase = createClient()
  const { data: post } = await supabase.from("posts").select("*").eq("id", params.id).single()
  if (!post) notFound()

  return (
    <PostEditorProvider initialPost={post as any}>
      <PostEditorLayout />
    </PostEditorProvider>
  )
}
