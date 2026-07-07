import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { postToFacebook } from "@/lib/social-publisher"

export async function POST() {
  try {
    const supabase = createClient()

    const { data: accounts } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("platform", "facebook")
      .eq("is_active", true)
      .single()

    if (!accounts) {
      return NextResponse.json({ error: "No connected Facebook account found. Save credentials in Integrations first." }, { status: 400 })
    }

    const creds = accounts.credentials || {}
    if (!creds.page_id || !creds.page_access_token) {
      return NextResponse.json({ error: "Facebook credentials incomplete (page_id or page_access_token missing)." }, { status: 400 })
    }

    const testContent = "🚀 Test post from Techpivo CMS — our Facebook auto-publisher is now live! Stay tuned for the latest tech news, tutorials, and AI insights.\n\nhttps://techpivo.com"

    const postId = await postToFacebook(testContent, creds)

    if (!postId) {
      return NextResponse.json({ error: "Facebook returned no post ID" }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      postId,
      url: `https://facebook.com/${postId}`,
      message: "Test post published successfully!",
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Post failed" }, { status: 500 })
  }
}
