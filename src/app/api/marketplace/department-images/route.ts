import { NextResponse } from "next/server"
import { createPublicClient } from "@/lib/supabase/server"

// GET /api/marketplace/department-images?slug=<department_slug>
// Returns up to 8 product image URLs for the given department, including
// images from any of its subcategories, used by the mobile category nav
// (client component) to show real product images for each department tile
// instead of placeholder/pixel images.
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
    // Match products at the department level OR any of its subcategories so
    // department tiles always have real artwork when the department has stock.
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
