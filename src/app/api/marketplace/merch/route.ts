import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseMarketMerch } from "@/lib/marketplace-merch"

export const dynamic = "force-dynamic"

// GET /api/marketplace/merch — public per-product merchandising flags
// (Admin → Marketplace → Products sale/new/bestseller toggles).
export async function GET() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "marketplace_merch")
      .maybeSingle()
    return NextResponse.json({ merch: parseMarketMerch((data as { value?: unknown } | null)?.value) })
  } catch {
    return NextResponse.json({ merch: {} })
  }
}
