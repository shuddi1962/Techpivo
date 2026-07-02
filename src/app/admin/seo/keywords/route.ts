import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { keyword, postId } = await request.json()

    if (!keyword) {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 })
    }

    // Check if keyword already exists
    const { data: existing } = await supabase
      .from("keyword_rankings")
      .select("id, position")
      .eq("keyword", keyword.toLowerCase().trim())
      .single()

    if (existing) {
      // Update existing keyword
      const { data, error } = await supabase
        .from("keyword_rankings")
        .update({
          post_id: postId || null,
          last_checked_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, keyword: data })
    }

    // Create new keyword
    const { data, error } = await supabase
      .from("keyword_rankings")
      .insert({
        keyword: keyword.toLowerCase().trim(),
        post_id: postId || null,
        last_checked_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, keyword: data })
  } catch (error: any) {
    console.error("Keyword tracking error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get("postId")

    let query = supabase
      .from("keyword_rankings")
      .select("*")
      .order("position", { ascending: true })

    if (postId) {
      query = query.eq("post_id", postId)
    }

    const { data, error } = await query.limit(100)
    if (error) throw error

    return NextResponse.json({ keywords: data })
  } catch (error: any) {
    console.error("Get keywords error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("keyword_rankings")
      .delete()
      .eq("id", id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Delete keyword error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
