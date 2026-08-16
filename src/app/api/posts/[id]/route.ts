import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/admin-auth"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const auth = await requireAdminRole(["admin", "editor"], req)
  if (!auth.ok) return auth.response

  const supabase = createClient()

  const { data: post } = await supabase.from("posts").select("slug, status").eq("id", id).maybeSingle()

  const { error } = await supabase.from("posts").delete().eq("id", id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (post?.slug) {
    revalidatePath("/")
    revalidatePath(`/${post.slug}`)
  }

  return NextResponse.json({ success: true })
}