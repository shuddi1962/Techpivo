"use client"

import { useCallback, useEffect, useState } from "react"
import { PackageSearch, RefreshCw, RotateCcw } from "lucide-react"

interface OrderItem {
  name: string
  qty: number
  unit_usd: number
  image?: string | null
}

interface Order {
  id: string
  email: string
  items: OrderItem[]
  subtotal_usd: number | null
  shipping_usd: number | null
  total_usd: number | null
  total_ngn: number | null
  paystack_reference: string | null
  paystack_status: string
  cj_order_id: string | null
  cj_status: string | null
  fulfill_error: string | null
  status: string
  ship_name: string | null
  ship_phone: string | null
  ship_address: string | null
  ship_city: string | null
  ship_state: string | null
  ship_zip: string | null
  ship_country: string | null
  ship_method: string | null
  ship_eta: string | null
  created_at: string
}

const STATUSES = ["pending", "paid", "fulfilled", "delivered", "cancelled"]

export function MarketplaceOrdersTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState("")
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [retrying, setRetrying] = useState("")

  const load = useCallback(async () => {
    const r = await fetch("/admin/marketplace/api?section=orders").then((x) => x.json()).catch(() => null)
    if (r?.orders) setOrders(r.orders)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const poll = setInterval(load, 30000)
    return () => clearInterval(poll)
  }, [load])

  const setStatus = async (id: string, status: string) => {
    const res = await fetch("/admin/marketplace/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "order-status", id, status }),
    })
    if (res.ok) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))
      setNotice(`Order marked ${status}.`)
      setTimeout(() => setNotice(""), 3000)
    }
  }

  const retry = async (id: string) => {
    setRetrying(id)
    setNotice("")
    try {
      const r = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fulfill-retry", id }),
      }).then((x) => x.json())
      if (r?.success) {
        setNotice(`Sent to CJ — fulfillment order ${r.cj_order_id}.`)
        load()
      } else {
        setNotice(r?.error || "Retry failed — see order details.")
        load()
      }
    } finally {
      setRetrying("")
      setTimeout(() => setNotice(""), 5000)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border rounded-xl p-10 text-center text-sm text-slate-500">
        <RefreshCw className="h-4 w-4 animate-spin inline mr-2" /> Loading orders...
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white border rounded-xl p-10 text-center">
        <PackageSearch className="h-8 w-8 text-slate-300 mx-auto mb-2" />
        <p className="font-bold text-slate-900">No orders yet</p>
        <p className="text-sm text-slate-500 mt-1">Paid checkouts appear here instantly with Korapay + CJ fulfillment status.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {notice && <p className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2">{notice}</p>}
      {orders.map((o) => {
        const addr = [o.ship_address, [o.ship_city, o.ship_state, o.ship_zip].filter(Boolean).join(" "), o.ship_country].filter(Boolean).join(", ")
        const needsAction = o.status === "paid" && !o.cj_order_id
        return (
          <div key={o.id} className="bg-white border rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-900">{o.paystack_reference || o.id.slice(0, 8)}</p>
                <p className="text-xs text-slate-500">{o.email} · {o.ship_name || ""}{o.ship_city ? ` · ${o.ship_city}` : ""} · {new Date(o.created_at).toLocaleString()}</p>
              </div>
              <span className="text-[11px] font-bold uppercase px-2 py-1 rounded-full bg-amber-50 text-amber-700">{o.status}</span>
            </div>
            <ul className="text-sm text-slate-600 mt-2 space-y-0.5">
              {(Array.isArray(o.items) ? o.items : []).map((it, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="line-clamp-1">{it.name} × {it.qty}</span>
                  <span className="font-semibold whitespace-nowrap">${(Number(it.unit_usd || 0) * it.qty).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 border-t pt-3">
              <p className="text-sm font-bold text-slate-900">
                ₦{Number(o.total_ngn || 0).toLocaleString()}
                <span className="ml-2 text-xs font-normal text-slate-400">pay: {o.paystack_status}{o.cj_order_id ? ` · CJ ${o.cj_order_id}` : o.status === "paid" ? " · fulfillment queued" : ""}</span>
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setOpen((p) => ({ ...p, [o.id]: !p[o.id] }))} className="text-xs border rounded-lg px-2 py-1.5 bg-white hover:bg-slate-50">
                  {open[o.id] ? "Hide details" : "Customer + order details"}
                </button>
                <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} className="text-xs border rounded-lg px-2 py-1.5 bg-white" aria-label={`Order status for ${o.paystack_reference}`}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            {open[o.id] && (
              <div className="mt-3 rounded-lg bg-slate-50 border px-3 py-2.5 text-xs text-slate-600 space-y-1.5">
                <p><span className="font-bold text-slate-800">Customer:</span> {o.ship_name || "—"} · {o.email} · {o.ship_phone || "no phone"}</p>
                <p><span className="font-bold text-slate-800">Address:</span> {addr || "—"}</p>
                <p><span className="font-bold text-slate-800">Courier:</span> {o.ship_method || "—"}{o.ship_eta ? ` (${o.ship_eta})` : ""}</p>
                <p>
                  <span className="font-bold text-slate-800">Breakdown:</span> subtotal ${Number(o.subtotal_usd || 0).toFixed(2)} + shipping ${Number(o.shipping_usd || 0).toFixed(2)} = ${Number(o.total_usd || 0).toFixed(2)} · charged ₦{Number(o.total_ngn || 0).toLocaleString()}
                </p>
                <p><span className="font-bold text-slate-800">Fulfillment:</span> {o.cj_order_id ? `CJ order ${o.cj_order_id} (${o.cj_status || "submitted"})` : `not sent to CJ${o.cj_status ? ` (${o.cj_status})` : ""}`}</p>
                {o.fulfill_error && (
                  <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5"><span className="font-bold">CJ error:</span> {o.fulfill_error}</p>
                )}
                {needsAction && (
                  <button onClick={() => retry(o.id)} disabled={retrying === o.id} className="inline-flex items-center gap-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg px-3 py-1.5 disabled:opacity-50">
                    <RotateCcw className={`h-3.5 w-3.5 ${retrying === o.id ? "animate-spin" : ""}`} />
                    {retrying === o.id ? "Sending to CJ..." : "Retry CJ fulfillment"}
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
