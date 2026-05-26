import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"

export async function POST(req: Request) {
  try {
    const { postId, pageUrl, referrer, country } = await req.json()
    if (!postId) {
      return NextResponse.json({ error: "postId required" }, { status: 400 })
    }

    const supabase = createClient()

    await supabase.rpc("increment_post_views", { post_id: postId })

    await supabase.from("analytics_events").insert({
      event_type: "page_view",
      post_id: postId,
      page_url: pageUrl || null,
      referrer: referrer || null,
      country: country || null,
      user_agent: req.headers.get("user-agent") || null,
      ip_hash: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("increment-views error:", error)
    return NextResponse.json({ error: "Failed to increment views" }, { status: 500 })
  }
}
