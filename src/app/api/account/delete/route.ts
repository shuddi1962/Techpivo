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
      "comments", "reactions", "newsletter_sends", "analytics_events", 
      "reading_list", "social_posts_log", "affiliate_clicks", "seo_audits",
      "keyword_rankings", "seo_issues", "internal_link_suggestions", 
      "content_decay", "article_workflow", "article_versions", 
      "article_comments", "article_versions", "launch_event_articles",
      "knowledge_article_links", "content_experiments", "content_briefs",
      "editorial_calendar", "content_decay", "article_discussions",
      "content_gaps", "product_launches", "email_queues"
    ]
    
    for (const table of tables) {
      await supabase.from(table).delete().eq("user_id", userId)
    }
    
    await supabase.from("data_deletion_requests").insert({
      user_id: userId,
      provider: "self-service",
      status: "completed",
      confirmation_code: crypto.randomUUID().slice(0, 16),
      completed_at: new Date().toISOString(),
    })
    
    await supabase.auth.signOut()
    
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Account deletion error:", err)
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}
