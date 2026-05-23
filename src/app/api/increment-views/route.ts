import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"

export async function POST(req: Request) {
  try {
    const { postId } = await req.json()
    if (!postId) {
      return NextResponse.json({ error: "postId required" }, { status: 400 })
    }

    const supabase = createClient()
    await supabase.rpc("increment_post_views", { post_id: postId })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to increment views" }, { status: 500 })
  }
}
