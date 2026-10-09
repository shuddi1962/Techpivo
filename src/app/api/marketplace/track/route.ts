import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

// Best-effort product view/click counter (powers "most viewed" sorting)
// + conversion analytics sink (quickview / recommend / cart / checkout
// events -> marketplace_events; product ids + counts only, no PII).
const EVENT_KINDS = new Set([
  "quickview_open",
  "quickview_add",
  "recommend_impression",
  "recommend_select",
  "recommend_add",
  "cart_open",
  "cart_qty",
  "cart_remove",
  "checkout_start",
  "checkout_pay_attempt",
  "checkout_success",
  "checkout_fail",
  "bundle_add",
])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const kind = typeof body?.kind === "string" ? body.kind : ""
    const rawId = typeof body?.product_id === "string" ? body.product_id : typeof body?.id === "string" ? body.id : ""
    const id = /^[0-9a-f-]{8,64}$/i.test(rawId) ? rawId : ""
    // Analytics event path (new) — never rejects; falls through to legacy.
    if (kind && EVENT_KINDS.has(kind)) {
      try {
        const supabase = createClient()
        await supabase.from("marketplace_events").insert({
          kind,
          product_id: /^[0-9a-f-]{36}$/i.test(id) ? id : null,
          data: {},
        })
      } catch {
        // table missing pre-migration or RLS — localStorage counters keep the data
      }
      // quickview opens also count as product interest for "most viewed".
      if (!id || kind !== "quickview_open") return NextResponse.json({ ok: true })
    }
    if (!/^[0-9a-f-]{8,64}$/i.test(id)) return NextResponse.json({ ok: false }, { status: 400 })
    const supabase = createClient()
    const { data: row } = await supabase.from("affiliate_products").select("clicks").eq("id", id).maybeSingle()
    const current = Number((row as { clicks?: number } | null)?.clicks ?? 0)
    await supabase.from("affiliate_products").update({ clicks: current + 1 }).eq("id", id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
