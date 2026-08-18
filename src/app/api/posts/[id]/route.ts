import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/admin-auth"
import { auditLog } from "@/lib/audit-log"

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

  void auditLog({ user_id: auth.user.id, action: "post_delete", entity_type: "post", entity_id: id, details: { slug: post?.slug, status: post?.status } })

  if (post?.slug) {
    revalidatePath("/")
    revalidatePath(`/${post.slug}`)
  }

  return NextResponse.json({ success: true })
}