import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseMarketSales } from "@/lib/marketplace-sales"

export const dynamic = "force-dynamic"

// GET /api/marketplace/sales — public per-product sale-end timers
// (Admin → Marketplace → Products → "Sale ends").
export async function GET() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "marketplace_sales")
      .maybeSingle()
    return NextResponse.json({ sales: parseMarketSales((data as { value?: unknown } | null)?.value) })
  } catch {
    return NextResponse.json({ sales: {} })
  }
}
