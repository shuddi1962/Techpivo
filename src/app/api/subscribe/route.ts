import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"

export async function POST(req: Request) {
  try {
    const { email, name, categories } = await req.json()
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }

    const supabase = createClient()
    const { error } = await supabase.from("subscribers").upsert(
      { email, name, categories: categories || [], status: "active" },
      { onConflict: "email" }
    )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Subscribe error:", error)
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 })
  }
}
