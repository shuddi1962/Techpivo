"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, PackageSearch, Truck, CheckCircle2, Clock, MapPin, AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react"

interface TrackedItem {
  id: string
  name: string
  qty: number
  unit_usd: number
  image?: string | null
  variant_name?: string | null
  tracking_number: string | null
  carrier: string | null
  ship_method: string | null
  ship_eta: string | null
  ship_status: string | null
  shipped_at: string | null
  delivered_at: string | null
  events: Array<{
    event_type: string
    event_description: string
    location: string | null
    event_at: string
  }>
}

interface TrackedOrder {
  paystack_reference: string
  status: string
  paystack_status: string
  cj_order_id: string | null
  cj_status: string | null
  total_ngn: number | null
  total_usd: number | null
  items: TrackedItem[]
  created_at: string
  ship_city: string | null
  ship_country: string | null
  ship_method: string | null
  ship_eta: string | null
  coupon_code: string | null
  discount_usd: number
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Order Received",
  paid: "Payment Confirmed",
  fulfilled: "Sent to Supplier",
  partially_submitted: "Partially Shipped",
  dispatched: "Dispatched",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  exception: "Delivery Exception",
  cancelled: "Cancelled",
  currency_mismatch: "Currency Issue",
  amount_mismatch: "Amount Issue",
  manual_needed: "Needs Attention",
}

const STATUS_TONE: Record<string, "emerald" | "amber" | "red" | "blue" | "neutral"> = {
  pending: "blue",
  paid: "blue",
  fulfilled: "amber",
  partially_submitted: "amber",
  dispatched: "emerald",
  in_transit: "emerald",
  out_for_delivery: "emerald",
  delivered: "emerald",
  exception: "red",
  cancelled: "red",
  currency_mismatch: "red",
  amount_mismatch: "red",
  manual_needed: "amber",
}

const EVENT_ICON: Record<string, typeof Truck> = {
  dispatched: Truck,
  in_transit: Truck,
  out_for_delivery: Truck,
  delivered: CheckCircle2,
  exception: AlertTriangle,
  cancelled: AlertTriangle,
}

export function TrackPage() {
  const params = useSearchParams()
  const [reference, setReference] = useState(params.get("reference") || "")
  const [email, setEmail] = useState(params.get("email") || "")
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [order, setOrder] = useState<TrackedOrder | null>(null)

  const lookup = async (quiet = false) => {
    setError("")
    if (!quiet) setOrder(null)
    if (!reference.trim() || !email.trim()) {
      if (!quiet) setError("Enter your order reference and the email you paid with.")
      return
    }
    if (!quiet) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch(
        `/api/marketplace/orders/track?reference=${encodeURIComponent(reference.trim())}&email=${encodeURIComponent(email.trim())}`
      )
      const data = await res.json()
      if (res.ok && data?.order) {
        // Enrich with per-item tracking from the tracking API.
        let items: TrackedItem[] = []
        try {
          const orderId = (data.order as { id?: string }).id
          if (orderId) {
            const tr = await fetch(`/api/marketplace/tracking?order_id=${encodeURIComponent(orderId)}`)
            const td = await tr.json()
            items = (td.tracking || []).map((row: any) => ({
              id: row.item_id,
              name: (data.order.items || []).find((it: any) => it.id === row.item_id)?.name || "Item",
              qty: (data.order.items || []).find((it: any) => it.id === row.item_id)?.qty || 1,
              unit_usd: (data.order.items || []).find((it: any) => it.id === row.item_id)?.unit_usd || 0,
              image: (data.order.items || []).find((it: any) => it.id === row.item_id)?.image || null,
              tracking_number: row.tracking_number,
              carrier: row.carrier,
              ship_method: row.ship_method,
              ship_eta: row.ship_eta,
              ship_status: row.ship_status,
              shipped_at: row.shipped_at,
              delivered_at: row.delivered_at,
              events: Array.isArray(row.events) ? row.events : [],
            }))
          }
        } catch {
          // fall back to order-level items
          items = (data.order.items || []).map((it: any) => ({
            id: it.id,
            name: it.name,
            qty: it.qty,
            unit_usd: it.unit_usd,
            image: it.image,
            variant_name: it.variant_name,
            tracking_number: null,
            carrier: null,
            ship_method: data.order.ship_method,
            ship_eta: data.order.ship_eta,
            ship_status: data.order.status,
            shipped_at: null,
            delivered_at: null,
            events: [],
          }))
        }
        setOrder({
          ...(data.order as TrackedOrder),
          items,
          coupon_code: data.coupon?.coupon_code ?? null,
          discount_usd: Number(data.coupon?.discount_usd) || 0,
        } as TrackedOrder)
      } else if (!quiet) {
        setError(data?.error || "Order not found.")
      }
    } catch {
      if (!quiet) setError("Lookup failed. Check your connection and try again.")
    } finally {
      if (!quiet) setLoading(false)
      else setRefreshing(false)
    }
  }

  useEffect(() => {
    if (reference.trim() && email.trim()) lookup(true)
  }, [reference, email])

  const stepOf = (status: string): number => {
    const order = ["pending", "paid", "fulfilled", "dispatched", "in_transit", "out_for_delivery", "delivered"]
    return Math.max(0, order.indexOf(status))
  }

  const itemStatus = (it: TrackedItem): string => it.ship_status || order?.status || "pending"

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Lookup form */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <PackageSearch className="h-5 w-5 text-[#F59E0B]" />
          <h1 className="text-xl font-extrabold text-[#0F172A]">Track your order</h1>
        </div>
        <p className="text-sm text-slate-500 mb-4">Use the payment reference (e.g. TPM-…) and the email you paid with.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value.toUpperCase())}
            placeholder="Order reference (TPM-…)"
            className="border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#F59E0B]"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Payment email"
            className="border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#F59E0B]"
          />
          <button
            onClick={() => lookup(false)}
            disabled={loading}
            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-bold py-2.5 rounded-lg disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Looking up…</> : "Track order"}
          </button>
        </div>
        {error && <p className="text-sm text-[#EF4444] mt-3">{error}</p>}
      </div>

      {order && (
        <>
          {/* Order header + status */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Order Reference</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="font-mono text-sm font-bold text-[#0F172A]">{order.paystack_reference}</code>
                  <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    STATUS_TONE[order.status] === "emerald" ? "bg-emerald-50 text-emerald-700" :
                    STATUS_TONE[order.status] === "red" ? "bg-red-50 text-red-700" :
                    STATUS_TONE[order.status] === "amber" ? "bg-amber-50 text-amber-700" :
                    "bg-blue-50 text-blue-700"
                  }`}>
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <span className="block text-[11px] text-slate-400 uppercase tracking-wider">Total Paid</span>
                  <span className="block font-extrabold text-[#0F172A]">₦{Number(order.total_ngn || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                  <span className="block text-xs text-slate-500">≈ ${Number(order.total_usd || 0).toFixed(2)} USD</span>
                </div>
                {order.coupon_code && order.discount_usd > 0 && (
                  <span className="text-xs font-semibold text-[#047857] bg-[#ECFDF5] px-2 py-1 rounded">
                    Coupon {order.coupon_code} saved ${order.discount_usd.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* Progress timeline */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center pointer-events-none">
                <span className="flex-1 h-[2px] bg-slate-200"></span>
              </div>
              <div className="flex justify-between relative z-10 px-2">
                {["pending", "paid", "fulfilled", "dispatched", "in_transit", "out_for_delivery", "delivered"].map((s, i) => {
                  const active = stepOf(order.status) >= i
                  const label = s === "pending" ? "Received" : s === "paid" ? "Paid" : s === "fulfilled" ? "Fulfilled" : s === "dispatched" ? "Dispatched" : s === "in_transit" ? "In Transit" : s === "out_for_delivery" ? "Out for Delivery" : "Delivered"
                  return (
                    <div key={s} className="flex flex-col items-center gap-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${
                        active ? "bg-[#10B981] text-white" : "bg-slate-100 text-slate-400"
                      }`}>
                        {i + 1}
                      </div>
                      <span className={`text-[10px] font-medium ${
                        active ? "text-[#0F172A]" : "text-slate-400"
                      }`}>{label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-4 text-sm">
              <div className="px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Ordered</span>
                <span className="block text-slate-700">{new Date(order.created_at).toLocaleString()}</span>
              </div>
              <div className="px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Delivering to</span>
                <span className="block text-slate-700">{order.ship_city || "—"}</span>
              </div>
              <div className="px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Method</span>
                <span className="block text-slate-700">{order.ship_method || "Standard"}</span>
              </div>
              <div className="px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="block text-[10px] text-slate-400 uppercase tracking-wider">ETA</span>
                <span className="block text-slate-700">{order.ship_eta || "7–12 days"}</span>
              </div>
            </div>

            {order.cj_order_id && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <ShieldCheck className="h-4 w-4 text-[#10B981] shrink-0" />
                <span className="text-xs text-slate-700">Fulfilled via supplier <code className="font-mono text-slate-500">{order.cj_order_id}</code></span>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-6">
            <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider mb-4">Items in this order</h2>
            <div className="space-y-3">
              {order.items.map((it) => (
                <div key={it.id} className="flex items-start gap-3 p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/50">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white border border-[#E2E8F0]">
                    {it.image ? (
                      <img src={it.image} alt={it.name} className="h-full w-full object-cover rounded-md" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                    ) : (
                      <PackageSearch className="h-6 w-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#0F172A] leading-snug">{it.name}</div>
                    {it.variant_name && <div className="text-[11px] text-slate-500 mt-0.5">{it.variant_name}</div>}
                    <div className="mt-1.5 flex items-baseline gap-1">
                      <span className="text-xs font-bold text-slate-700">${(Number(it.unit_usd || 0) * it.qty).toFixed(2)}</span>
                      <span className="text-xs text-slate-500">× {it.qty}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className={`text-[11px] font-bold ${
                      itemStatus(it) === "delivered" ? "text-[#10B981]" :
                      itemStatus(it) === "exception" || itemStatus(it) === "cancelled" ? "text-[#EF4444]" :
                      itemStatus(it) === "dispatched" || itemStatus(it) === "in_transit" || itemStatus(it) === "out_for_delivery" ? "text-[#10B981]" :
                      "text-slate-500"
                    }`}>
                      {STATUS_LABEL[itemStatus(it)] || itemStatus(it)}
                    </div>
                    {it.tracking_number && (
                      <div className="text-[11px] font-mono text-slate-600 truncate max-w-[120px]">
                        {it.tracking_number}
                      </div>
                    )}
                    {it.carrier && (
                      <div className="text-[10px] text-slate-400">{it.carrier}</div>
                    )}
                    {it.ship_eta && (
                      <div className="text-[10px] text-slate-400">ETA {it.ship_eta}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tracking timeline */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">Shipment Tracking</h2>
              <button
                onClick={() => lookup(true)}
                disabled={refreshing}
                className="text-xs text-[#B45309] hover:text-[#D97706] flex items-center gap-1"
              >
                {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Refresh
              </button>
            </div>
            <div className="relative">
              <div className="absolute left-2.5 top-0 bottom-0 w-[2px] bg-slate-200" />
              {order.items.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No shipment events yet. Tracking appears once the supplier hands the parcel to the courier.</p>
              ) : (
                <div className="space-y-6">
                  {order.items.map((it, itemIdx) => (
                    <div key={it.id} className="mb-6 last:mb-0">
                      <div className="flex items-end gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {it.name} × {it.qty}
                        </span>
                        {it.tracking_number && (
                          <span className="text-[10px] font-mono text-slate-500">#{it.tracking_number}</span>
                        )}
                      </div>
                      <div className="relative pl-8">
                        {it.events.length === 0 ? (
                          <div className="flex flex-col items-center py-4 text-center">
                            <div className="w-7 h-7 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                              <PackageSearch className="h-3.5 w-3.5 text-slate-400" />
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Awaiting first scan</p>
                          </div>
                        ) : (
                          it.events.map((ev, evIdx) => {
                            const isLast = evIdx === it.events.length - 1
                            const Icon = EVENT_ICON[ev.event_type] || Truck
                            const active = isLast
                            return (
                              <div key={ev.event_at} className="relative mb-4 last:mb-0">
                                <div className={`absolute left-0 top-2.5 w-2.5 h-2.5 rounded-full ${active ? "bg-[#10B981]" : "bg-slate-300"}`} />
                                {isLast ? (
                                  <div className={`absolute left-0 top-0 w-7 h-7 rounded-full border-2 ${active ? "border-[#10B981] bg-white" : "border-slate-300 bg-slate-50"} flex items-center justify-center z-10`}>
                                    <Icon className={`h-3 w-3 ${active ? "text-[#10B981]" : "text-slate-500"}`} />
                                  </div>
                                ) : (
                                  <div className="absolute left-2 top-2.5 w-2.5 h-2.5 rounded-full bg-slate-300" />
                                )}
                                <div className="ml-1">
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-sm font-medium text-[#0F172A]">{ev.event_description}</span>
                                    <span className="text-[10px] text-slate-400">{new Date(ev.event_at).toLocaleString()}</span>
                                  </div>
                                  {ev.location && (
                                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                                      <MapPin className="h-3 w-3" />
                                      <span>{ev.location}</span>
                                    </div>
                                  )}
                                </div>
                                {!isLast && <div className="absolute left-0.5 top-8 bottom-0 w-[2px] bg-slate-200" />}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Tracking events come from our fulfillment partner. Delivery dates are estimates — carriers may deliver earlier or later.
            </p>
          </div>

          <div className="bg-[#0F172A] rounded-2xl p-4 sm:p-6 text-center">
            <h3 className="text-sm font-bold text-white mb-2">Need help?</h3>
            <p className="text-sm text-slate-300 mb-3">If your tracking hasn&apos;t moved in 5+ business days, contact our support team.</p>
            <button className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-bold px-4 py-2 rounded-lg">Contact Support</button>
          </div>
        </>
      )}
    </div>
  )
}
