"use client"

import { useCallback, useEffect, useState } from "react"
import { PackageSearch, RefreshCw, RotateCcw } from "lucide-react"

interface OrderItem {
  id: string
  name: string
  qty: number
  unit_usd: number
  image?: string | null
  cj_vid?: string | null
  cj_pid?: string | null
}

interface VariantOpt {
  vid: string
  label: string
  price: number | null
  image: string
  stock: number | null
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
  const [cjCost, setCjCost] = useState<Record<string, { loading: boolean; product?: number; postage?: number; total?: number; track?: string | null; error?: string }>>({})
  const [varPick, setVarPick] = useState<Record<string, { open: boolean; loading: boolean; options: VariantOpt[]; picked: string; saving: boolean; error: string }>>({})

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

  const loadCj = async (o: Order) => {
    if (!o.cj_order_id || !o.paystack_reference) return
    setCjCost((p) => ({ ...p, [o.id]: { loading: true } }))
    try {
      const r = await fetch(
        `/api/marketplace/orders/track?reference=${encodeURIComponent(o.paystack_reference)}&email=${encodeURIComponent(o.email)}`
      ).then((x) => x.json())
      const t = r?.tracking as { productAmount?: number; postageAmount?: number; orderAmount?: number; trackNumber?: string | null } | null
      if (t && t.orderAmount != null) {
        setCjCost((p) => ({
          ...p,
          [o.id]: {
            loading: false,
            product: Number(t.productAmount) || 0,
            postage: Number(t.postageAmount) || 0,
            total: Number(t.orderAmount) || 0,
            track: t.trackNumber || null,
          },
        }))
      } else {
        setCjCost((p) => ({ ...p, [o.id]: { loading: false, error: "CJ has no bill yet — pay the CJ order in your CJ dashboard first." } }))
      }
    } catch {
      setCjCost((p) => ({ ...p, [o.id]: { loading: false, error: "Could not reach CJ right now." } }))
    }
  }

    // Admin variant picker for lines the auto-heal could not resolve
  // (genuinely ambiguous options like 18Pro vs 18Pro Max). Options load
  // lazily per line so CJ is never hammered with burst queries.
  const varKey = (orderId: string, lineId: string) => `${orderId}::${lineId}`

  const toggleVarPicker = async (orderId: string, line: OrderItem) => {
    const k = varKey(orderId, line.id)
    const cur = varPick[k]
    if (cur?.open) {
      setVarPick((p) => ({ ...p, [k]: { ...cur, open: false } }))
      return
    }
    setVarPick((p) => ({ ...p, [k]: { open: true, loading: true, options: [], picked: "", saving: false, error: "" } }))
    try {
      const d = await fetch(`/api/marketplace/variants?product_id=${encodeURIComponent(line.id)}`).then((x) => x.json())
      const opts = (Array.isArray(d?.variants) ? d.variants : []) as VariantOpt[]
      setVarPick((p) => ({
        ...p,
        [k]: { open: true, loading: false, options: opts, picked: opts.length === 1 ? opts[0].vid : "", saving: false, error: opts.length === 0 ? (d?.error ? `CJ: ${String(d.error).slice(0, 120)}` : "CJ returned no options for this product.") : "" },
      }))
    } catch {
      setVarPick((p) => ({ ...p, [k]: { open: true, loading: false, options: [], picked: "", saving: false, error: "Could not reach CJ right now — try again." } }))
    }
  }

  const saveVarPick = async (orderId: string, line: OrderItem) => {
    const k = varKey(orderId, line.id)
    const cur = varPick[k]
    if (!cur?.picked || cur.saving) return
    setVarPick((p) => ({ ...p, [k]: { ...cur, saving: true, error: "" } }))
    try {
      const r = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fulfill-set-variant", id: orderId, line_id: line.id, cj_vid: cur.picked }),
      }).then((x) => x.json())
      if (r?.success) {
        setNotice(`Variant saved for "${line.name.slice(0, 40)}" — hit Retry CJ fulfillment.`)
        setTimeout(() => setNotice(""), 5000)
        load()
      } else {
        setVarPick((p) => ({ ...p, [k]: { ...cur, saving: false, error: r?.error || "Could not save." } }))
      }
    } catch {
      setVarPick((p) => ({ ...p, [k]: { ...cur, saving: false, error: "Could not save. Check your connection." } }))
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
      <div className="bg-white border rounded-xl p-4">
        <p className="text-sm font-bold text-slate-900 mb-1">How you make money on every order</p>
        <p className="text-xs text-slate-600 leading-relaxed">
          Customer pays <strong>(your price + shipping)</strong> → you pay CJ <strong>(their cost + their postage)</strong> + a small Korapay fee → <strong>you keep the difference</strong>.
          Three guardrails protect you: shipping is charged at live CJ rates <strong>+35%</strong>; every product carries at least <strong>$1.50</strong> margin;
          fallback shipping is <strong>$9</strong>. Free shipping over $35 means you absorb postage on big baskets — deliberate, the basket covers it.
        </p>
      </div>
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
                {o.cj_order_id && (
                  <div>
                    {!cjCost[o.id] && (
                      <button onClick={() => loadCj(o)} className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2">
                        Show what CJ charged vs what you kept
                      </button>
                    )}
                    {cjCost[o.id]?.loading && <p className="text-slate-500">Asking CJ...</p>}
                    {cjCost[o.id]?.error && <p className="text-amber-700">{cjCost[o.id].error}</p>}
                    {cjCost[o.id]?.total != null && (
                      <p>
                        <span className="font-bold text-slate-800">CJ bill:</span> product ${cjCost[o.id].product!.toFixed(2)} + postage ${cjCost[o.id].postage!.toFixed(2)} = ${cjCost[o.id].total!.toFixed(2)}
                        {" "}· you collected ${Number(o.total_usd || 0).toFixed(2)} → <span className={`font-bold ${Number(o.total_usd || 0) - cjCost[o.id].total! >= 0 ? "text-emerald-700" : "text-red-700"}`}>you keep ≈ ${(Number(o.total_usd || 0) - cjCost[o.id].total!).toFixed(2)}</span> <span className="text-slate-400">(before Korapay fee)</span>
                        {cjCost[o.id].track ? <span className="block mt-0.5">Tracking: <span className="font-semibold text-slate-800">{cjCost[o.id].track}</span></span> : <span className="block mt-0.5 text-slate-400">No tracking yet — CJ issues it after they ship.</span>}
                      </p>
                    )}
                  </div>
                )}
                {o.fulfill_error && (
                  <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5"><span className="font-bold">CJ error:</span> {o.fulfill_error}</p>
                )}
                {needsAction && (Array.isArray(o.items) ? o.items : []).some((it) => !(it as OrderItem).cj_vid) && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-2 py-2 space-y-1.5">
                    <p className="font-bold text-amber-900">Pick the supplier option for each line below, then retry:</p>
                    {(Array.isArray(o.items) ? o.items : []).map((it, i) => {
                      const line = it as OrderItem
                      if (line.cj_vid) return null
                      const k = varKey(o.id, line.id)
                      const st = varPick[k]
                      return (
                        <div key={`${line.id}-${i}`} className="rounded-md bg-white border border-amber-200 px-2 py-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-800 line-clamp-1">{line.name} × {line.qty}</span>
                            <button onClick={() => toggleVarPicker(o.id, line)} className="shrink-0 text-[11px] font-bold text-amber-800 underline underline-offset-2 hover:text-amber-900">
                              {st?.open ? "Hide options" : "Choose option"}
                            </button>
                          </div>
                          {st?.open && (
                            <div className="mt-1.5 space-y-1.5">
                              {st.loading && <p className="text-slate-500">Asking CJ for options...</p>}
                              {st.error && <p className="text-amber-800">{st.error}</p>}
                              {!st.loading && st.options.length > 0 && (
                                <div className="flex flex-col sm:flex-row gap-1.5">
                                  <select
                                    value={st.picked}
                                    onChange={(e) => setVarPick((p) => ({ ...p, [k]: { ...st, picked: e.target.value } }))}
                                    className="flex-1 text-xs border rounded-lg px-2 py-1.5 bg-white"
                                    aria-label={`Supplier option for ${line.name}`}
                                  >
                                    <option value="">Select the exact option...</option>
                                    {st.options.map((v) => (
                                      <option key={v.vid} value={v.vid}>{v.label.slice(0, 90)}{v.price != null ? ` — $${Number(v.price).toFixed(2)}` : ""}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => saveVarPick(o.id, line)}
                                    disabled={!st.picked || st.saving}
                                    className="text-[11px] font-bold bg-slate-900 text-white rounded-lg px-3 py-1.5 disabled:opacity-50"
                                  >
                                    {st.saving ? "Saving..." : "Save"}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
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
