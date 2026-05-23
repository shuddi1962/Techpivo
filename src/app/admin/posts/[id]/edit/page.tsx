import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { PostEditor } from "./post-editor"

type Props = { params: { id: string } }

export default async function EditPostPage({ params }: Props) {
  const supabase = createClient()
  const { data: post } = await supabase.from("posts").select("*").eq("id", params.id).single()
  if (!post) notFound()

  return <PostEditor post={post} />
}
