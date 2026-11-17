import { NextResponse } from "next/server"
import { createPublicClient } from "@/lib/supabase/server"

// GET /api/marketplace/mobile-banners
// Returns the admin-configured mobile homepage banner settings (banners +
// transition + upload config), independent of the desktop banner system.
// Used by the client-side MobileHeroBanner carousel on the mobile homepage
// only — desktop is unaffected.
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
    const settings = parseMobileBanners((data as { value?: unknown } | null)?.value)
    // Only enabled banners, in order. Transition + upload settings pass
    // through so the client can render without hardcoded values.
    return NextResponse.json({
      banners: settings.banners.filter((b) => b.enabled),
      transition: settings.transition,
      upload: settings.upload,
    })
  } catch {
    return NextResponse.json({ banners: [], transition: {}, upload: {} })
  }
}
