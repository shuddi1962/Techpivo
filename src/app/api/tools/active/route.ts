import { NextResponse } from "next/server"
import { createPublicClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = createPublicClient()
  const { data, error } = await supabase.from("tools").select("slug")
  if (error || !data) return NextResponse.json({ slugs: [] })
  return NextResponse.json({ slugs: data.map((t: any) => t.slug) })
}
