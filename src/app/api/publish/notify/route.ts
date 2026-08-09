import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendNewsletterForPost } from "@/lib/newsletter"
import { sendPushNotification } from "@/lib/web-push"

export async function POST(request: NextRequest) {
  try {
    const { slug } = await request.json()
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    if (!profile || !["admin", "editor"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: post } = await supabase
      .from("posts")
      .select("id, title, slug, seo_description, excerpt, featured_image, category_id")
      .eq("slug", slug)
      .eq("status", "published")
      .single()

    if (!post) {
      return NextResponse.json({ error: "Published post not found" }, { status: 404 })
    }

    let categorySlug = ""
    if (post.category_id) {
      const { data: cat } = await supabase
        .from("categories")
        .select("slug")
        .eq("id", post.category_id)
        .single()
      categorySlug = cat?.slug || ""
    }

    const postData = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || post.seo_description || "",
      seo_description: post.seo_description || post.excerpt || "",
      featured_image: post.featured_image || "",
      category_slug: categorySlug,
    }

    void sendNewsletterForPost(postData).catch((err) => console.error("Publish newsletter error:", err))
    void sendPushNotification(postData).catch((err) => console.error("Publish push error:", err))

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Publish notify error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
