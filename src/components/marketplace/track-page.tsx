"use client"

import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { Loader2, PackageSearch } from "lucide-react"

interface TrackedOrder {
  paystack_reference: string
  status: string
  paystack_status: string
  cj_order_id: string | null
  cj_status: string | null
  total_ngn: number | null
  total_usd: number | null
  items: Array<{ name: string; qty: number; unit_usd: number }>
  created_at: string
  ship_city: string | null
}

const STATUS_STEPS = ["pending", "paid", "fulfilled", "delivered"]

export function TrackPage() {
  const params = useSearchParams()
  const [reference, setReference] = useState(params.get("reference") || "")
  const [email, setEmail] = useState(params.get("email") || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [order, setOrder] = useState<TrackedOrder | null>(null)

  const lookup = async () => {
    setError("")
    setOrder(null)
    if (!reference.trim() || !email.trim()) {
      setError("Enter your order reference and the email you paid with.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch(
        `/api/marketplace/orders/track?reference=${encodeURIComponent(reference.trim())}&email=${encodeURIComponent(email.trim())}`
      )
      const data = await res.json()
      if (res.ok && data?.order) setOrder(data.order as TrackedOrder)
      else setError(data?.error || "Order not found.")
    } catch {
      setError("Lookup failed. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const stepIdx = order ? Math.max(0, STATUS_STEPS.indexOf(order.status)) : -1

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-6">
        <h1 className="text-xl font-extrabold text-[#0F172A] flex items-center gap-2">
          <PackageSearch className="h-5 w-5 text-[#F59E0B]" /> Track your order
        </h1>
        <p className="text-sm text-slate-500 mt-1">Use the Paystack reference (e.g. TPM-...) and your payment email.</p>
        <div className="grid gap-2 mt-4">
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Order reference (TPM-...)" className="border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#F59E0B]" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Payment email" className="border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#F59E0B]" />
          <button onClick={lookup} disabled={loading} className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-bold py-2.5 rounded-lg disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Looking up...</> : "Track order"}
          </button>
        </div>
        {error && <p className="text-sm text-[#EF4444] mt-3">{error}</p>}
      </div>

      {order && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-bold text-[#0F172A]">{order.paystack_reference}</span>
            <span className="text-[11px] font-bold uppercase px-2 py-1 rounded-full bg-amber-50 text-amber-700">{order.status}</span>
          </div>
          <div className="flex items-center gap-0 pt-1" aria-label={`Order status: ${order.status}`}>
            {STATUS_STEPS.map((s, i) => (
              <div key={s} className="flex-1 flex items-center last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i <= stepIdx ? "bg-[#10B981] text-white" : "bg-slate-100 text-slate-400"}`}>
                    {i + 1}
                  </span>
                  <span className="text-[10px] capitalize text-slate-500">{s}</span>
                </div>
                {i < STATUS_STEPS.length - 1 && <span className={`flex-1 h-0.5 mx-1 mb-5 rounded ${i < stepIdx ? "bg-[#10B981]" : "bg-slate-100"}`} />}
              </div>
            ))}
          </div>
          <div className="text-sm text-slate-600 space-y-1 border-t border-[#E2E8F0] pt-3">
            {(Array.isArray(order.items) ? order.items : []).map((it, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span className="line-clamp-1">{it.name} × {it.qty}</span>
                <span className="font-semibold whitespace-nowrap">${(Number(it.unit_usd || 0) * it.qty).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-[#0F172A] pt-1">
              <span>Total paid</span>
              <span>₦{Number(order.total_ngn || 0).toLocaleString()} (≈ ${Number(order.total_usd || 0).toFixed(2)})</span>
            </div>
            <p className="text-xs text-slate-400">Ordered {new Date(order.created_at).toLocaleString()}{order.ship_city ? ` · delivering to ${order.ship_city}` : ""}</p>
            {order.cj_order_id && <p className="text-xs text-slate-400">Fulfillment ID: {order.cj_order_id}</p>}
            {(Array.isArray(order.items) ? order.items : []).length > 1 && (
              <p className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 text-[11px] leading-relaxed text-slate-500">
                Your items may ship in separate parcels and arrive on different days — each parcel is tracked to your door.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
