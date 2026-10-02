import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const productId = new URL(request.url).searchParams.get("product_id") || ""
  if (!productId) return NextResponse.json({ error: "product_id required" }, { status: 400 })
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("marketplace_reviews")
    .select("id,author_name,rating,title,comment,created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(20)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reviews: data || [] })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const productId = typeof body?.product_id === "string" ? body.product_id : ""
    const rating = Math.max(1, Math.min(5, Math.floor(Number(body?.rating) || 0)))
    const comment = String(body?.comment || "").trim().slice(0, 1000)
    const author = String(body?.author_name || "Verified buyer").trim().slice(0, 60) || "Verified buyer"
    if (!productId || !comment || !rating) {
      return NextResponse.json({ error: "Product, rating and review text are required." }, { status: 400 })
    }
    const supabase = await createClient()
    const { data: product } = await supabase.from("affiliate_products").select("id").eq("id", productId).eq("is_active", true).maybeSingle()
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 })
    const { data, error } = await supabase
      .from("marketplace_reviews")
      .insert({ product_id: productId, author_name: author, rating, comment })
      .select("id,author_name,rating,title,comment,created_at")
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ review: data })
  } catch {
    return NextResponse.json({ error: "Could not submit your review." }, { status: 500 })
  }
}
