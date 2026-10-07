// Marketplace order emails (server-side only).
// Buyer confirmation + admin alert, sent fire-and-forget right after an
// order flips to paid (verify endpoint + Korapay webhook). Failures never
// break the payment flow — they only log.

import { sendBrandedEmail } from "@/lib/email"
import { createClient } from "@/lib/supabase/admin"
import { sanitizeStore, MARKET_STORE_DEFAULTS } from "@/lib/marketplace-store"
import { escapeHtml } from "@/lib/markdown"

interface NotifyLine {
  name?: string
  qty?: number
  unit_usd?: number
}

interface NotifyOrder {
  id: string
  email: string
  items?: NotifyLine[]
  subtotal_usd?: number | string | null
  shipping_usd?: number | string | null
  total_usd?: number | string | null
  total_ngn?: number | string | null
  paystack_reference?: string | null
  ship_name?: string | null
  ship_phone?: string | null
  ship_address?: string | null
  ship_city?: string | null
  ship_state?: string | null
  ship_zip?: string | null
  ship_country?: string | null
  ship_method?: string | null
  ship_eta?: string | null
  cj_order_id?: string | null
}

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://techpivo.com").replace(/\/$/, "")

async function storeEmail(): Promise<string> {
  try {
    const supabase = createClient()
    const { data } = await supabase.from("site_settings").select("value").eq("key", "marketplace_store").maybeSingle()
    return sanitizeStore((data as { value?: unknown } | null)?.value).email || MARKET_STORE_DEFAULTS.email
  } catch {
    return MARKET_STORE_DEFAULTS.email
  }
}

const money = (v: number | string | null | undefined, prefix: string) => {
  const n = Number(v)
  return `${prefix}${Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}`
}

function itemsRows(items: NotifyLine[]): string {
  return (Array.isArray(items) ? items : [])
    .map((it) => {
      const qty = Math.max(1, Number(it.qty) || 1)
      const line = Number(it.unit_usd || 0) * qty
      return `<tr><td style="padding:8px 0;color:#E2E8F0;font-size:14px;">${escapeHtml(String(it.name || "Item"))} × ${qty}</td><td align="right" style="padding:8px 0;color:#E2E8F0;font-size:14px;">$${line.toFixed(2)}</td></tr>`
    })
    .join("")
}

function addressBlock(o: NotifyOrder): string {
  const parts = [o.ship_name, o.ship_address, [o.ship_city, o.ship_state, o.ship_zip].filter(Boolean).join(" "), o.ship_country, o.ship_phone]
    .filter(Boolean)
    .map((p) => escapeHtml(String(p)))
    .join("<br>")
  return parts || "—"
}

export async function notifyMarketplacePaid(order: NotifyOrder): Promise<void> {
  try {
    const reference = String(order.paystack_reference || "").trim()
    const trackUrl = `${SITE}/marketplace/track${reference ? `?reference=${encodeURIComponent(reference)}&email=${encodeURIComponent(order.email)}` : ""}`
    const lines = itemsRows(order.items || [])
    const method = [order.ship_method, order.ship_eta].filter(Boolean).join(" · ")

    // 1. Buyer confirmation
    try {
      await sendBrandedEmail({
        to: order.email,
        subject: `Order confirmed ${reference ? `(${reference}) ` : ""}— TechPivo Market`,
        title: "Payment received — thank you!",
        preheader: `Your TechPivo Market order ${reference} is confirmed.`,
        bodyHtml: [
          `<p>Hi${order.ship_name ? ` ${escapeHtml(order.ship_name)}` : ""}, your payment was successful and your order is now being prepared.</p>`,
          `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0;border-top:1px solid #1E2D42;border-bottom:1px solid #1E2D42;">${lines}</table>`,
          `<p>Subtotal: <strong style="color:#E2E8F0;">${money(order.subtotal_usd, "$")}</strong><br>Shipping${method ? ` (${escapeHtml(method)})` : ""}: <strong style="color:#E2E8F0;">${money(order.shipping_usd, "$")}</strong><br>Total charged: <strong style="color:#F59E0B;">${money(order.total_ngn, "₦")}</strong> <span style="color:#64748B;">(${money(order.total_usd, "$")})</span></p>`,
          `<p>Deliver to:<br>${addressBlock(order)}</p>`,
          `<p style="color:#64748B;font-size:13px;">Your tracking number appears on the tracking page once our fulfillment partner ships your parcel${order.ship_eta ? ` (ETA ${escapeHtml(order.ship_eta)})` : ""}. Keep your reference <strong style="color:#E2E8F0;">${escapeHtml(reference || order.id.slice(0, 8))}</strong>.</p>`,
        ].join(""),
        cta: { label: "Track your order", url: trackUrl },
        footerNote: "Questions? Reply to this email and our team will help.",
      })
    } catch {
      // buyer mail best-effort
    }

    // 2. Admin alert (fulfill from the dashboard when CJ needs a hand)
    try {
      const admin = await storeEmail()
      await sendBrandedEmail({
        to: admin,
        subject: `New paid order ${reference} — ${money(order.total_ngn, "₦")}`,
        title: "New paid order",
        preheader: `Paid order ${reference} needs ${order.cj_order_id ? "no action (sent to CJ)" : "fulfillment attention"}.`,
        bodyHtml: [
          `<p><strong style="color:#E2E8F0;">${escapeHtml(reference || order.id)}</strong> · ${money(order.total_ngn, "₦")} (${money(order.total_usd, "$")}) · ${escapeHtml(order.email)}</p>`,
          `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0;border-top:1px solid #1E2D42;border-bottom:1px solid #1E2D42;">${lines}</table>`,
          `<p>Ship to:<br>${addressBlock(order)}</p>`,
          `<p style="color:#64748B;font-size:13px;">Fulfillment: ${order.cj_order_id ? `sent to CJ (${escapeHtml(order.cj_order_id)})` : "<strong style=\"color:#F59E0B;\">MANUAL ACTION NEEDED</strong> — open Admin → Marketplace → Orders and press Retry."}</p>`,
        ].join(""),
        cta: { label: "Open orders", url: `${SITE}/admin/marketplace` },
        footerNote: "TechPivo Market order notification.",
      })
    } catch {
      // admin mail best-effort
    }
  } catch {
    // never break the payment flow
  }
}
