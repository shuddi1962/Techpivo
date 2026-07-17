import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  const userId = user.id
  
  try {
    await supabase.auth.admin.deleteUser(userId)
    
    const tables = [
      "user_profiles", "user_follows", "user_bookmarks", "user_reading_history",
      "user_badges", "user_xp_log", "user_notifications", "forum_posts",
      "forum_replies", "forum_votes", "quiz_attempts", "poll_votes",
      "article_discussions", "discussion_replies", "event_rsvps"
    ]
    
    for (const table of tables) {
      const col = table === "user_profiles" ? "id" : table === "forum_posts" || table === "forum_replies" ? "author_id" : "user_id"
      await supabase.from(table).delete().eq(col, userId)
    }
    
    await supabase.auth.signOut()
    
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Account deletion error:", err)
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}
