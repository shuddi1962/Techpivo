import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdmin } from "@/lib/supabase/admin"
import { paystackInit } from "@/lib/paystack"

export const dynamic = "force-dynamic"

interface CheckoutItem {
  id: string
  qty: number
}

// POST /api/marketplace/checkout — validate cart server-side, create a
// pending order, and initialize a Paystack transaction (NGN).
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
      const unit = Number(p.sale_price ?? p.original_price ?? 0)
      if (!Number.isFinite(unit) || unit <= 0) continue
      subtotal += unit * qty
      lines.push({
        id: p.id,
        name: p.product_name,
        image: p.product_image_url,
        unit_usd: Math.round(unit * 100) / 100,
        qty,
        cj_pid: (p as { cj_pid?: string }).cj_pid || null,
        cj_vid: (p as { cj_vid?: string }).cj_vid || null,
      })
    }
    if (lines.length === 0) {
      return NextResponse.json({ error: "None of those products are available anymore." }, { status: 400 })
    }

    const shippingUsd = subtotal >= 49 ? 0 : 5
    const totalUsd = Math.round((subtotal + shippingUsd) * 100) / 100

    // NGN total via live FX (fallback 1600) — Paystack charges kobo
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
      })
      .select("id")
      .single()
    if (orderError || !order) return NextResponse.json({ error: "Could not create your order." }, { status: 500 })

    try {
      const origin = new URL(request.url).origin
      const init = await paystackInit(email, totalNgn * 100, reference, { order_id: order.id, items: lines.length }, `${origin}/marketplace/checkout/success`)
      return NextResponse.json({
        order_id: order.id,
        reference,
        authorization_url: init.authorization_url,
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
