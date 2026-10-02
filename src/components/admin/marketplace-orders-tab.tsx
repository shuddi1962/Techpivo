"use client"

import { useCallback, useEffect, useState } from "react"
import { PackageSearch, RefreshCw } from "lucide-react"

interface Order {
  id: string
  email: string
  items: Array<{ name: string; qty: number; unit_usd: number }>
  total_usd: number | null
  total_ngn: number | null
  paystack_reference: string | null
  paystack_status: string
  cj_order_id: string | null
  status: string
  ship_name: string | null
  ship_city: string | null
  ship_country: string | null
  created_at: string
}

const STATUSES = ["pending", "paid", "fulfilled", "delivered", "cancelled"]

export function MarketplaceOrdersTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState("")

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
        <p className="text-sm text-slate-500 mt-1">Paid checkouts appear here instantly with Paystack + CJ fulfillment status.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {notice && <p className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2">{notice}</p>}
      {orders.map((o) => (
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
            <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} className="text-xs border rounded-lg px-2 py-1.5 bg-white" aria-label={`Order status for ${o.paystack_reference}`}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </div>
  )
}
