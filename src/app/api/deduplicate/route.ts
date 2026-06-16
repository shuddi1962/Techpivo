import { NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const { data: posts, error } = await getSupabase()
    .from("posts")
    .select("id, title, original_source_url, content")
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by URL -> keep post with longest content
  const urlGroups: Record<string, { id: string; len: number }[]> = {}
  for (const p of posts) {
    if (!p.original_source_url) continue
    const key = p.original_source_url.toLowerCase().trim()
    if (!urlGroups[key]) urlGroups[key] = []
    urlGroups[key].push({ id: p.id, len: p.content?.length || 0 })
  }

  const toDelete = new Set<string>()
  for (const key of Object.keys(urlGroups)) {
    const group = urlGroups[key]
    if (group.length <= 1) continue
    group.sort((a, b) => b.len - a.len)
    for (let i = 1; i < group.length; i++) toDelete.add(group[i].id)
  }

  // Group by exact title -> keep post with longest content
  const titleGroups: Record<string, { id: string; len: number }[]> = {}
  for (const p of posts) {
    if (!p.title) continue
    const key = p.title.toLowerCase().trim()
    if (!titleGroups[key]) titleGroups[key] = []
    titleGroups[key].push({ id: p.id, len: p.content?.length || 0 })
  }

  for (const key of Object.keys(titleGroups)) {
    const group = titleGroups[key]
    if (group.length <= 1) continue
    group.sort((a, b) => b.len - a.len)
    for (let i = 1; i < group.length; i++) toDelete.add(group[i].id)
  }

  // Delete in batches
  const ids = Array.from(toDelete)
  let removed = 0
  for (let i = 0; i < ids.length; i += 10) {
    await getSupabase().from("posts").delete().in("id", ids.slice(i, i + 10))
    removed += Math.min(10, ids.length - i)
  }

  return NextResponse.json({ removed, remaining: posts.length - removed })
}
