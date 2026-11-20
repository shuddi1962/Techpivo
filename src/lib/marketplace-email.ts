// Marketplace order emails (server-side only).
// Buyer confirmation + admin alert, sent fire-and-forget right after an
// order flips to paid (verify endpoint + payment webhook). Failures never
// break the payment flow — they only log.
//
// Product images are now embedded in every order email so shoppers can see
// what they bought without leaving their inbox.

import { sendBrandedEmail } from "@/lib/email"
import { createClient } from "@/lib/supabase/admin"
import { sanitizeStore, MARKET_STORE_DEFAULTS } from "@/lib/marketplace-store"
import { escapeHtml } from "@/lib/markdown"

interface NotifyLine {
  name?: string
  qty?: number
  unit_usd?: number
  image?: string | null
}

interface NotifyOrder {
  id: string
  email: string
  items?: NotifyLine[]
  subtotal_usd?: number | string | null
  shipping_usd?: number | string | null
  total_usd?: number | string | null
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
const PLACEHOLDER = "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=300"

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

function imageUrl(raw: string | null | undefined): string {
  if (!raw) return PLACEHOLDER
  const u = String(raw)
  if (/^https?:\/\//i.test(u)) return u
  return `${SITE}${u.startsWith("/") ? u : "/" + u}`
}

function productImageCell(it: NotifyLine): string {
  const img = imageUrl(it.image)
  const alt = escapeHtml(String(it.name || "Product"))
  return `
    <td style="padding:10px 0;text-align:center;">
      <a href="${SITE}/marketplace/track" style="text-decoration:none;">
        <img src="${img}" alt="${alt}" width="60" height="60" style="display:block;border-radius:8px;object-fit:cover;background:#1E2D42;" />
      </a>
    </td>`
}

function itemsRows(items: NotifyLine[]): string {
  return (Array.isArray(items) ? items : [])
    .map((it) => {
      const qty = Math.max(1, Number(it.qty) || 1)
      const line = Number(it.unit_usd || 0) * qty
      return `
      <tr style="border-bottom:1px solid #1E2D42;">
        ${productImageCell(it)}
        <td style="padding:12px 0;color:#E2E8F0;font-size:14px;vertical-align:middle;">
          <div style="font-weight:600;color:#F0F4FF;">${escapeHtml(String(it.name || "Item"))}</div>
          <div style="font-size:12px;color:#64748B;">Qty ${qty}</div>
        </td>
        <td align="right" style="padding:12px 0;color:#E2E8F0;font-size:14px;vertical-align:middle;">
          $${line.toFixed(2)}
        </td>
      </tr>`
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
    const itemCount = Array.isArray(order.items) ? order.items.length : 0

    // 1. Buyer confirmation — now with product images
    try {
      await sendBrandedEmail({
        to: order.email,
        subject: `Order confirmed ${reference ? `(${reference}) ` : ""}— TechPivo Market`,
        title: "Payment received — thank you!",
        preheader: `Your TechPivo Market order ${reference} is confirmed with ${itemCount} item${itemCount === 1 ? "" : "s"}.`,
        bodyHtml: [
          `<p>Hi${order.ship_name ? ` ${escapeHtml(order.ship_name)}` : ""}, your payment was successful and your order is now being prepared.</p>`,
          `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0;border-top:1px solid #1E2D42;border-bottom:1px solid #1E2D42;">
            <tr style="background:#16213E;">
              <th style="padding:10px 0;text-align:center;color:#F59E0B;font-size:12px;font-weight:700;text-transform:uppercase;">Product</th>
              <th style="padding:12px 0;color:#F0F4FF;font-size:13px;font-weight:600;text-align:left;">Item</th>
              <th style="padding:12px 0;color:#F0F4FF;font-size:13px;font-weight:600;text-align:right;">Amount</th>
            </tr>
            ${lines}
          </table>`,
          `<p>Subtotal: <strong style="color:#E2E8F0;">${money(order.subtotal_usd, "$")}</strong><br>Shipping${method ? ` (${escapeHtml(method)})` : ""}: <strong style="color:#E2E8F0;">${money(order.shipping_usd, "$")}</strong><br>Total charged: <strong style="color:#F59E0B;">${money(order.total_usd, "$")}</strong></p>`,
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
        subject: `New paid order ${reference} — ${money(order.total_usd, "$")}`,
        title: "New paid order",
        preheader: `Paid order ${reference} needs ${order.cj_order_id ? "no action (sent to CJ)" : "fulfillment attention"}.`,
        bodyHtml: [
          `<p><strong style="color:#E2E8F0;">${escapeHtml(reference || order.id)}</strong> · ${money(order.total_usd, "$")} · ${escapeHtml(order.email)}</p>`,
          `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0;border-top:1px solid #1E2D42;border-bottom:1px solid #1E2D42;">
            <tr style="background:#16213E;">
              <th style="padding:10px 0;text-align:center;color:#F59E0B;font-size:12px;font-weight:700;text-transform:uppercase;">Product</th>
              <th style="padding:12px 0;color:#F0F4FF;font-size:13px;font-weight:600;text-align:left;">Item</th>
              <th style="padding:12px 0;color:#F0F4FF;font-size:13px;font-weight:600;text-align:right;">Amount</th>
            </tr>
            ${lines}
          </table>`,
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
