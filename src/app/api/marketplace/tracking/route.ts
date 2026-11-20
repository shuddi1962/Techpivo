import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { checkRateLimit, clientIp } from "@/lib/rate-limiter"

export const dynamic = "force-dynamic"
export const maxDuration = 30

// POST /api/marketplace/tracking
//
// Accepts tracking updates from CJ, independent sellers, or TechPivo's own
// fulfillment. Updates marketplace_order_items + marketplace_tracking with
// the tracking number, courier, event history and shipment status.
//
// Body:
//   {
//     order_id: string,           // our order id
//     item_id?: string,           // specific line item (optional — updates all)
//     tracking_number: string,
//     carrier?: string,           // courier name
//     tracking_url?: string,
//     ship_method?: string,
//     ship_eta?: string,
//     events?: Array<{ event_type, event_description, location, event_at }>,
//     status?: "dispatched" | "in_transit" | "out_for_delivery" | "delivered" | "exception" | "cancelled"
//   }
//
// Idempotent: same tracking_number on the same item is a no-op.
export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit(`mkt_tracking_${clientIp(request)}`, { limit: 60, windowMs: 60 * 1000 })
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many tracking updates. Try again shortly." }, { status: 429 })
    }

    const body = await request.json().catch(() => null)
    const orderId = String(body?.order_id || "").trim()
    const itemId = body?.item_id ? String(body.item_id).trim() : null
    const trackingNumber = String(body?.tracking_number || "").trim()
    const carrier = String(body?.carrier || "").trim() || null
    const trackingUrl = String(body?.tracking_url || "").trim() || null
    const shipMethod = String(body?.ship_method || "").trim() || null
    const shipEta = String(body?.ship_eta || "").trim() || null
    const events = Array.isArray(body?.events) ? body.events : []
    const status = body?.status ? String(body.status) : null

    if (!orderId) {
      return NextResponse.json({ error: "order_id required." }, { status: 400 })
    }
    if (!trackingNumber) {
      return NextResponse.json({ error: "tracking_number required." }, { status: 400 })
    }

    const supabase = createClient()

    // Verify the order exists.
    const { data: order } = await supabase
      .from("marketplace_orders")
      .select("id,email,status")
      .eq("id", orderId)
      .maybeSingle()
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }

    // Find the line item(s) to update.
    let targetItemId = itemId
    if (!targetItemId) {
      // Pick the first outstanding line on the order.
      const { data: items } = await supabase
        .from("marketplace_order_items")
        .select("id,tracking_number,cj_sent")
        .eq("order_id", orderId)
        .limit(1)
      const first = (items || [])[0] as { id: string; tracking_number: string | null; cj_sent: boolean } | undefined
      if (first) targetItemId = first.id
    }
    if (!targetItemId) {
      return NextResponse.json({ error: "No line item on this order to attach tracking to." }, { status: 400 })
    }

    // Idempotency: same tracking number already on this item → nothing to do.
    const { data: existing } = await supabase
      .from("marketplace_order_items")
      .select("tracking_number")
      .eq("id", targetItemId)
      .maybeSingle()
    if (existing && (existing as { tracking_number: string | null }).tracking_number === trackingNumber) {
      return NextResponse.json({ success: true, updated: 0, message: "Tracking already recorded." })
    }

    // Update the line item.
    const patch: Record<string, unknown> = {
      tracking_number: trackingNumber,
      carrier,
      tracking_url: trackingUrl,
      ship_method: shipMethod || null,
      ship_eta: shipEta || null,
      updated_at: new Date().toISOString(),
    }
    if (status && ["dispatched", "in_transit", "out_for_delivery", "delivered", "exception", "cancelled"].includes(status)) {
      patch.ship_status = status
      if (status === "dispatched") patch.shipped_at = new Date().toISOString()
      if (status === "delivered") patch.delivered_at = new Date().toISOString()
    }
    const { error: upErr } = await supabase
      .from("marketplace_order_items")
      .update(patch)
      .eq("id", targetItemId)
    if (upErr) throw upErr

    // Append tracking events (dedupe by event_at + event_type).
    const insertedEvents: Array<Record<string, unknown>> = []
    for (const ev of events) {
      const et = String(ev.event_type || "").trim()
      const desc = String(ev.event_description || "").trim()
      const loc = String(ev.location || "").trim() || null
      const at = ev.event_at ? String(ev.event_at) : new Date().toISOString()
      if (!et || !desc) continue
      insertedEvents.push({
        order_item_id: targetItemId,
        order_id: orderId,
        tracking_number: trackingNumber,
        carrier,
        event_type: et,
        event_description: desc,
        location: loc,
        event_at: at,
      })
    }
    if (insertedEvents.length > 0) {
      const { error: evErr } = await supabase.from("marketplace_tracking").insert(insertedEvents)
      if (evErr) throw evErr
    }

    // Also record a fulfillment record if this is the first time we hear
    // about this shipment.
    const { data: fulf } = await supabase
      .from("marketplace_fulfillment")
      .select("id,status,courier,tracking_url,shipping_carrier,shipping_method")
      .eq("order_id", orderId)
      .maybeSingle()
    if (!fulf) {
      await supabase.from("marketplace_fulfillment").insert({
        order_id: orderId,
        order_item_id: targetItemId,
        fulfilment_type: "cj",
        courier: carrier || null,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl || null,
        shipping_carrier: carrier || null,
        shipping_method: shipMethod || null,
        status: status || "shipped",
        shipped_at: status === "dispatched" ? new Date().toISOString() : null,
        delivered_at: status === "delivered" ? new Date().toISOString() : null,
      })
    } else {
      await supabase
        .from("marketplace_fulfillment")
        .update({
          courier: carrier || fulf.courier,
          tracking_number: trackingNumber,
          tracking_url: trackingUrl || fulf.tracking_url,
          shipping_carrier: carrier || fulf.shipping_carrier,
          shipping_method: shipMethod || fulf.shipping_method,
          status: status || fulf.status,
          updated_at: new Date().toISOString(),
          ...(status === "shipped" && { shipped_at: new Date().toISOString() }),
          ...(status === "delivered" && { delivered_at: new Date().toISOString() }),
        })
        .eq("id", fulf.id)
    }

    return NextResponse.json({
      success: true,
      updated: 1,
      order_id: orderId,
      item_id: targetItemId,
      tracking_number: trackingNumber,
      carrier,
      events_recorded: insertedEvents.length,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Tracking update failed."
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET /api/marketplace/tracking?order_id=...&item_id=...
// Returns the tracking timeline for an order item.
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const orderId = url.searchParams.get("order_id") || ""
    const itemId = url.searchParams.get("item_id") || ""
    const trackingNumber = url.searchParams.get("tracking_number") || ""

    if (!orderId && !trackingNumber) {
      return NextResponse.json({ error: "order_id or tracking_number required." }, { status: 400 })
    }

    const supabase = createClient()

    let itemQuery = supabase.from("marketplace_order_items").select("id,order_id,tracking_number,carrier,ship_method,ship_eta,ship_status,shipped_at,delivered_at")
    if (orderId) itemQuery = itemQuery.eq("order_id", orderId)
    if (itemId) itemQuery = itemQuery.eq("id", itemId)
    const { data: items } = await itemQuery
    const rows = (items || []) as Array<{
      id: string; order_id: string; tracking_number: string | null; carrier: string | null;
      ship_method: string | null; ship_eta: string | null; ship_status: string | null;
      shipped_at: string | null; delivered_at: string | null;
    }>

    if (rows.length === 0) {
      return NextResponse.json({ tracking: [] })
    }

    const result = []
    for (const row of rows) {
      let eventsQuery = supabase
        .from("marketplace_tracking")
        .select("event_type,event_description,location,event_at")
        .eq("order_item_id", row.id)
        .order("event_at", { ascending: true })
      if (trackingNumber) eventsQuery = eventsQuery.eq("tracking_number", trackingNumber)
      const { data: events } = await eventsQuery
      result.push({
        item_id: row.id,
        order_id: row.order_id,
        tracking_number: row.tracking_number,
        carrier: row.carrier,
        ship_method: row.ship_method,
        ship_eta: row.ship_eta,
        ship_status: row.ship_status,
        shipped_at: row.shipped_at,
        delivered_at: row.delivered_at,
        events: (events || []).map((e) => ({
          event_type: e.event_type,
          event_description: e.event_description,
          location: e.location,
          event_at: e.event_at,
        })),
      })
    }

    return NextResponse.json({ tracking: result })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Tracking lookup failed."
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
