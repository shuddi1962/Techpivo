import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdmin } from "@/lib/supabase/admin"
import { korapayInit } from "@/lib/korapay"
import { cjGetVariants, MARKET_MARGIN } from "@/lib/cj"
import { storeShipOptions } from "@/lib/marketplace-shipping"
import { supplierShipOptions } from "@/lib/marketplace-freight"

export const dynamic = "force-dynamic"

interface CheckoutItem {
  id: string
  qty: number
  variant?: { vid?: string; label?: string } | null
}

// POST /api/marketplace/checkout — validate cart server-side, create a
// pending order, and initialize a Korapay checkout (NGN).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const items = (Array.isArray(body?.items) ? body.items : []) as CheckoutItem[]
    const email = String(body?.email || "").trim().toLowerCase()
    const ship = {
      name: String(body?.ship_name || "").trim().slice(0, 120),
      phone: String(body?.ship_phone || "").trim().slice(0, 40),
      address: String(body?.ship_address || "").trim().slice(0, 200),
      city: String(body?.ship_city || "").trim().slice(0, 80),
      state: String(body?.ship_state || "").trim().slice(0, 80),
      zip: String(body?.ship_zip || "").trim().slice(0, 20),
      country: (String(body?.ship_country || "NG").trim().toUpperCase().slice(0, 2) || "NG") as string,
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 })
    }
    if (items.length === 0 || items.length > 50) {
      return NextResponse.json({ error: "Your cart is empty." }, { status: 400 })
    }
    const shippingId = String(body?.shipping_id || body?.shipping_method || "standard").slice(0, 80)
    if (!ship.name || !ship.phone || !ship.address || !ship.city) {
      return NextResponse.json({ error: "Name, phone, address and city are required." }, { status: 400 })
    }

    const supabase = await createClient()
    const ids = [...new Set(items.map((i) => String(i.id)).filter(Boolean))].slice(0, 50)
    const { data: products, error } = await supabase
      .from("affiliate_products")
      .select("id,product_name,product_image_url,sale_price,original_price,cj_pid,cj_vid")
      .in("id", ids)
      .eq("is_active", true)
    if (error) return NextResponse.json({ error: "Could not load products." }, { status: 500 })
    const byId = new Map((products || []).map((p) => [p.id as string, p]))

    let subtotal = 0
    const lines = []
    for (const it of items) {
      const p = byId.get(String(it.id))
      const qty = Math.max(1, Math.min(99, Math.floor(Number(it.qty) || 1)))
      if (!p) continue
      const base = Number(p.sale_price ?? p.original_price ?? 0)
      if (!Number.isFinite(base) || base <= 0) continue
      // Selected option: verify its live price when the product is linked
      // to a supplier catalog, otherwise charge the base product price.
      let unit = base
      let vid = (p as { cj_vid?: string }).cj_vid || null
      const wantVid = typeof it.variant?.vid === "string" ? it.variant.vid.slice(0, 80) : ""
      const wantLabel = typeof it.variant?.label === "string" ? it.variant.label.slice(0, 120) : ""
      const cjPid = (p as { cj_pid?: string }).cj_pid || null
      if (wantVid && cjPid) {
        try {
          const variants = await cjGetVariants(cjPid)
          const match = (variants || []).find((v) => String(v.vid) === wantVid)
          const cost = match ? Number(match.variantSellPrice) : NaN
          if (match && Number.isFinite(cost) && cost > 0) {
            unit = Math.round(cost * MARKET_MARGIN * 100) / 100
            vid = wantVid
          }
        } catch {
          // supplier unreachable — fall back to base price, manual fulfillment
          vid = null
        }
      }
      subtotal += unit * qty
      lines.push({
        id: p.id,
        name: wantLabel ? `${p.product_name} (${wantLabel})` : p.product_name,
        image: p.product_image_url,
        unit_usd: Math.round(unit * 100) / 100,
        qty,
        cj_pid: cjPid,
        cj_vid: vid,
      })
    }
    if (lines.length === 0) {
      return NextResponse.json({ error: "None of those products are available anymore." }, { status: 400 })
    }

    // Delivery: buyer's chosen option, re-resolved server-side (never trusted
    // from the client). Supplier courier rates carry store markup. The
    // resolved method name + ETA are stored for fulfillment + tracking.
    let shippingUsd = 0
    let shipMethodName = "Standard"
    let shipEta = "7–12 days"
    if (shippingId === "express") {
      const opt = storeShipOptions(subtotal).find((o) => o.id === "express")
      shippingUsd = opt?.feeUsd ?? 19
      shipMethodName = "Express"
      shipEta = opt?.eta || "3–7 days"
    } else if (shippingId.startsWith("supplier:")) {
      const live = await supplierShipOptions(
        lines.map((l) => ({ product_id: l.id as string, variant_vid: (l.cj_vid as string) || "", qty: l.qty as number })),
        ship.country
      )
      const match = live.find((o) => o.id === shippingId)
      if (match) {
        shippingUsd = match.feeUsd
        shipMethodName = match.name
        shipEta = match.eta
      } else {
        const fb = storeShipOptions(subtotal).find((o) => o.id === "standard")
        shippingUsd = fb?.feeUsd ?? 5
      }
    } else {
      const opt = storeShipOptions(subtotal).find((o) => o.id === "standard")
      shippingUsd = opt?.feeUsd ?? 5
      shipEta = opt?.eta || shipEta
    }
    const totalUsd = Math.round((subtotal + shippingUsd) * 100) / 100

    // NGN total via live FX (fallback 1600) — Korapay charges naira units
    let usdNgn = 1600
    try {
      const fx = await fetch(`${new URL(request.url).origin}/api/tools/fx?from=USD&to=NGN&amount=1`, { signal: AbortSignal.timeout(8000) }).then((r) => r.json())
      const v = Number(fx?.rate)
      if (Number.isFinite(v) && v > 0) usdNgn = v
    } catch {
      // fallback
    }
    const totalNgn = Math.max(100, Math.round(totalUsd * usdNgn))
    const reference = `TPM-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    const admin = createAdmin()
    const { data: order, error: orderError } = await admin
      .from("marketplace_orders")
      .insert({
        email,
        items: lines,
        subtotal_usd: Math.round(subtotal * 100) / 100,
        shipping_usd: shippingUsd,
        total_usd: totalUsd,
        total_ngn: totalNgn,
        currency: "NGN",
        paystack_reference: reference,
        paystack_status: "pending",
        status: "pending",
        ship_name: ship.name,
        ship_phone: ship.phone,
        ship_address: ship.address,
        ship_city: ship.city,
        ship_state: ship.state || null,
        ship_zip: ship.zip || null,
        ship_country: ship.country,
        ship_method: shipMethodName,
        ship_eta: shipEta,
      })
      .select("id")
      .single()
    if (orderError || !order) return NextResponse.json({ error: "Could not create your order." }, { status: 500 })

    try {
      const origin = new URL(request.url).origin
      const init = await korapayInit({
        email,
        name: ship.name,
        amountNgn: totalNgn,
        reference,
        redirectUrl: `${origin}/marketplace/checkout/success`,
        notificationUrl: `${origin}/api/marketplace/webhook`,
        narration: `TechPivo Market order ${reference}`,
        metadata: { order_id: order.id },
      })
      return NextResponse.json({
        order_id: order.id,
        reference,
        authorization_url: init.checkout_url,
        total_ngn: totalNgn,
        total_usd: totalUsd,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment could not start."
      return NextResponse.json({ error: msg, order_id: order.id, reference }, { status: 503 })
    }
  } catch {
    return NextResponse.json({ error: "Checkout failed. Please try again." }, { status: 500 })
  }
}
