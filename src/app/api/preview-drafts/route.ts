import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@/lib/supabase/admin"
import { assertSameOrigin } from "@/lib/csrf"

export const runtime = "nodejs"

// Creates (or refreshes) a public preview_drafts row so the editor's Preview
// button works even before a post has ever been saved to the posts table.
export async function POST(request: Request) {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  const role = profile?.role
  if (!["admin", "editor", "author"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const rawSlug = String((body as any).slug || "")
  const slug = rawSlug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120)
  const title = String((body as any).title || "").slice(0, 300)
  const content = String((body as any).content || "").slice(0, 1_000_000)

  if (!slug && !title) {
    return NextResponse.json({ error: "A title is required to preview" }, { status: 400 })
  }
  const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").slice(0, 120)

  const service = createServiceClient()
  await service.from("preview_drafts").delete().eq("slug", finalSlug)
  const { error } = await service.from("preview_drafts").insert({
    post_id: typeof (body as any).post_id === "string" && (body as any).post_id ? (body as any).post_id : null,
    title: title || null,
    slug: finalSlug,
    content: content || null,
    excerpt: String((body as any).excerpt || "").slice(0, 400) || null,
    featured_image: String((body as any).featured_image || "").slice(0, 1000) || null,
    expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ slug: finalSlug, url: `/preview/${finalSlug}` })
}
