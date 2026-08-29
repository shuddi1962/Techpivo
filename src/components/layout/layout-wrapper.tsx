import { createClient } from "@/lib/supabase/server"
import { LayoutClient } from "./layout-client"

export async function LayoutWrapper({ children }: { children: React.ReactNode }) {
  let categories: any[] = []
  let socialUrls: Record<string, string> = {}
  let recentPosts: any[] = []

  try {
    const supabase = await createClient()
    const [catsRes, settingsRes, recentRes] = await Promise.all([
      supabase.from("categories").select("*, subcategories(*)").eq("is_active", true).order("name"),
      supabase.from("site_settings").select("key, value").like("key", "social_%"),
      supabase.from("posts").select("id,title,slug,featured_image").eq("status", "published").order("published_at", { ascending: false }).limit(6),
    ])

    if (catsRes.data) categories = catsRes.data as any[]
    if (recentRes.data) recentPosts = recentRes.data as any[]
    if (settingsRes.data) {
      const map: Record<string, string> = {}
      ;(settingsRes.data as any[]).forEach((row: any) => {
        const platform = row.key.replace("social_", "")
        const val = typeof row.value === "string" ? row.value : ""
        if (val) map[platform] = val
      })
      socialUrls = map
    }
  } catch (e) {
    console.warn("LayoutWrapper server-side fetch failed", e)
  }

  return (
    <LayoutClient
      categories={categories}
      socialUrls={socialUrls}
      recentPosts={recentPosts}
    >
      {children}
    </LayoutClient>
  )
}
