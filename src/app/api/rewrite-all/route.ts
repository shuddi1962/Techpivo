import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: posts, error: fetchError } = await supabase
      .from("posts")
      .select("id, title")
      .eq("ai_rewritten", false)
      .limit(10)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!posts?.length) {
      return NextResponse.json({ rewritten: 0, total: 0 })
    }

    const total = posts.length
    let rewritten = 0

    for (const post of posts) {
      try {
        const response = await fetch(
          process.env.NEXT_PUBLIC_SUPABASE_URL + "/functions/v1/rewrite-post",
          {
            method: "POST",
            headers: {
              Authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ post_id: post.id }),
          }
        )

        if (response.ok) {
          rewritten++
        }
      } catch {
        // fallback to local endpoint
        try {
          const localResponse = await fetch(
            process.env.NEXT_PUBLIC_SITE_URL + "/api/rewrite-post",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ post_id: post.id }),
            }
          )

          if (localResponse.ok) {
            rewritten++
          }
        } catch {
          // skip this post
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    return NextResponse.json({ rewritten, total })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
