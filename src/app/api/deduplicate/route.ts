import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, title, original_source_url, content")
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let removed = 0

  // Group by original_source_url
  const urlGroups = new Map<string, any[]>()
  for (const p of posts) {
    if (!p.original_source_url) continue
    const key = p.original_source_url.toLowerCase().trim()
    if (!urlGroups.has(key)) urlGroups.set(key, [])
    urlGroups.get(key)!.push(p)
  }

  for (const [, group] of Array.from(urlGroups)) {
    if (group.length <= 1) continue
    // Keep the one with the longest content, remove the rest
    group.sort((a: any, b: any) => (b.content?.length || 0) - (a.content?.length || 0))
    const keep = group[0]
    for (const dup of group.slice(1)) {
      if (dup.id === keep.id) continue
      await supabase.from("posts").delete().eq("id", dup.id)
      removed++
    }
  }

  // Also group by similar title (exact match lowercased)
  const titleGroups = new Map<string, any[]>()
  for (const p of posts) {
    if (!p.title) continue
    const key = p.title.toLowerCase().trim()
    if (!titleGroups.has(key)) titleGroups.set(key, [])
    titleGroups.get(key)!.push(p)
  }

  for (const [, group] of Array.from(titleGroups)) {
    if (group.length <= 1) continue
    group.sort((a: any, b: any) => (b.content?.length || 0) - (a.content?.length || 0))
    const keep = group[0]
    for (const dup of group.slice(1)) {
      const alreadyRemoved = await supabase.from("posts").select("id").eq("id", dup.id).maybeSingle()
      if (alreadyRemoved.data) {
        await supabase.from("posts").delete().eq("id", dup.id)
        removed++
      }
    }
  }

  return NextResponse.json({ message: `Removed ${removed} duplicates`, remaining: posts.length - removed })
}
