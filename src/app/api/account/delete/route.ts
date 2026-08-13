import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@/lib/supabase/admin"
import { createClient as createSessionClient } from "@/lib/supabase/server"

const TABLES: { table: string; col: string }[] = [
  { table: "user_profiles", col: "id" },
  { table: "user_follows", col: "follower_id" },
  { table: "user_bookmarks", col: "user_id" },
  { table: "user_reading_history", col: "user_id" },
  { table: "user_badges", col: "user_id" },
  { table: "user_xp_log", col: "user_id" },
  { table: "user_notifications", col: "user_id" },
  { table: "forum_posts", col: "author_id" },
  { table: "forum_replies", col: "author_id" },
  { table: "forum_votes", col: "user_id" },
  { table: "quiz_attempts", col: "user_id" },
  { table: "poll_votes", col: "user_id" },
  { table: "article_discussions", col: "author_id" },
  { table: "discussion_replies", col: "author_id" },
  { table: "event_rsvps", col: "user_id" },
  { table: "community_posts", col: "author_id" },
  { table: "community_replies", col: "author_id" },
  { table: "community_votes", col: "user_id" },
  { table: "community_follows", col: "user_id" },
  { table: "community_post_topics", col: "user_id" },
  { table: "reputation_ledger", col: "user_id" },
  { table: "content_reports", col: "reporter_id" },
  { table: "user_notification_settings", col: "user_id" },
]

export async function POST(request: NextRequest) {
  // Identity from the session cookie (anon client), privileged work via the
  // service-role client (auth.admin.deleteUser + cross-table cleanup).
  const session = await createSessionClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()
  const userId = user.id

  try {
    for (const { table, col } of TABLES) {
      try {
        await supabase.from(table).delete().eq(col, userId)
      } catch {
        // table may not exist yet — skip
      }
    }

    await supabase.auth.admin.deleteUser(userId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Account deletion error:", err)
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}
