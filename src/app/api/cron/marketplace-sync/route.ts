// GET/POST /api/cron/marketplace-sync — the automatic hand-in-hand sync
// between TechPivo Market and the CJDropshipping platform.
//
// Runs every 10 minutes (Supabase pg_cron). It needs no human: every store
// product is pushed into CJ "My Products", every product without a supplier
// variant gets one, and the CJ order status is pulled back into our orders.
//
// CRON_SECRET protected like every other cron route.

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { isCronAuthorized } from "@/lib/cron-auth"
import { fillMissingVariants, syncCatalogueToCj, syncOrderStatuses } from "@/lib/marketplace-cj-sync"

export const dynamic = "force-dynamic"
// CJ allows ~1 request/second, so a run is a series of small batches.
export const maxDuration = 60

async function run() {
  const supabase = createClient()
  const report: Record<string, unknown> = {}
  // CJ allows one request per second, so every batch is time-boxed: the
  // function must finish well inside the 60s platform ceiling.
  const deadline = Date.now() + 42_000

  // 1. Orders first — the customer is waiting on them.
  const orders = await syncOrderStatuses(supabase, { limit: 12, deadline })
  report.orders = orders

  // 2. Products that cannot be fulfilled yet (no supplier variant).
  const variants = await fillMissingVariants(supabase, { limit: 12, deadline })
  report.variants = variants

  // 3. Push the catalogue into CJ "My Products".
  const catalogue = await syncCatalogueToCj(supabase, { limit: 12, deadline })
  report.catalogue = catalogue

  // Record the run so the admin can see the sync is alive.
  try {
    await supabase
      .from("site_settings")
      .upsert(
        {
          key: "marketplace_cj_sync",
          value: {
            at: new Date().toISOString(),
            orders: orders.synced,
            variants: variants.filled,
            pushed: catalogue.pushed,
            remaining: catalogue.remaining,
          } as unknown as never,
        },
        { onConflict: "key" }
      )
  } catch {
    /* the sync itself already ran */
  }

  return NextResponse.json({ ok: true, ...report })
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isCronAuthorized(req, { required: true }))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return await run()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
