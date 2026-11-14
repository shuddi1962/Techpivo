import { NextResponse } from "next/server"
import { createPublicClient } from "@/lib/supabase/server"

// GET /api/marketplace/mobile-banners
// Returns the admin-configured mobile homepage banner list (independent of
// the desktop banner system). Each banner carries image, link, enabled flag
// and display order. Used by the client-side MobileBanners carousel on the
// mobile homepage only — desktop is unaffected.
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const supabase = createPublicClient()
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "marketplace_mobile_banners")
      .maybeSingle()
    const { parseMobileBanners } = await import("@/lib/marketplace-mobile-banners")
    const banners = parseMobileBanners((data as { value?: unknown } | null)?.value)
    // Only enabled banners, in order.
    return NextResponse.json({ banners: banners.filter((b) => b.enabled) })
  } catch {
    return NextResponse.json({ banners: [] })
  }
}
