import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseMarketMerch, parseMarketMerchGlobal } from "@/lib/marketplace-merch"

export const dynamic = "force-dynamic"
export const revalidate = 0

const NO_STORE = { "Cache-Control": "no-store, max-age=0" }

// GET /api/marketplace/merch — public per-product merchandising flags
// (Admin → Marketplace → Products sale/new/bestseller toggles) plus the
// store-wide sale_badges switch. Never cached: admin changes must show on
// the very next refresh, never the previous value first.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "marketplace_merch")
      .maybeSingle()
    const raw = (data as { value?: unknown } | null)?.value
    return NextResponse.json(
      { merch: parseMarketMerch(raw), sale_badges: parseMarketMerchGlobal(raw) },
      { headers: NO_STORE }
    )
  } catch {
    return NextResponse.json({ merch: {}, sale_badges: true }, { headers: NO_STORE })
  }
}
