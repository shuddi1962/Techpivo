import { NextResponse } from "next/server"
import { createPublicClient } from "@/lib/supabase/server"

// GET /api/marketplace/subcategory-images?slug=<subcategory_slug>
// Returns up to 8 product image URLs for the given subcategory, used by the
// mobile category nav (client component) to rotate subcategory card images.
// Route handlers run in a Server Component context, so createPublicClient is
// safe here (next/headers cookies() works in Route Handlers).
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get("slug")
    if (!slug) {
      return NextResponse.json({ images: [] })
    }

    const supabase = createPublicClient()
    const { data } = await supabase
      .from("affiliate_products")
      .select("product_image_url")
      .eq("is_active", true)
      .or(`category_slug.eq.${slug},subcategory_slug.eq.${slug}`)
      .neq("product_image_url", "")
      .limit(8)

    const images = (data || [])
      .map((r) => r.product_image_url)
      .filter(Boolean) as string[]

    return NextResponse.json({ images })
  } catch {
    return NextResponse.json({ images: [] })
  }
}
