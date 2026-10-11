import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

// Best-effort popup campaign analytics sink (view / click / close per
// campaign id; no PII). Never breaks the storefront — always 200.
const EVENTS = new Set(["view", "click", "close"])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const rawId = typeof body?.campaign_id === "string" ? body.campaign_id : ""
    const event = typeof body?.event === "string" ? body.event : ""
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(rawId) || !EVENTS.has(event)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    try {
      const supabase = createClient()
      await supabase.from("marketplace_popup_stats").insert({ campaign_id: rawId, event })
    } catch {
      // table missing pre-migration or RLS — analytics degrade silently
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
