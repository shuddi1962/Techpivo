"use client"

import { useCallback, useEffect, useState } from "react"
import { DollarSign, Edit2, Trash2, Plus, Globe, X } from "lucide-react"
import {
  marketBtnDarkCls,
  marketBtnGhostCls,
  marketBtnPrimaryCls,
  marketCardCls,
  marketInputCls,
  marketThCls,
  MarketBadge,
  MarketCardHead,
  MarketEmpty,
  MarketField,
  MarketKpi,
  MarketPageBar,
  MarketNotice,
  MarketTableShell,
} from "@/components/admin/marketplace-ui"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

const MARKET_CURRENCIES = [
  "USD", "NGN", "EUR", "GBP", "GHS", "KES", "ZAR", "CAD", "AUD", "INR", "JPY", "AED",
]

const CURRENCY_LABEL: Record<string, string> = {
  USD: "US Dollar", NGN: "Nigerian Naira", EUR: "Euro", GBP: "British Pound",
  GHS: "Ghanaian Cedi", KES: "Kenyan Shilling", ZAR: "South African Rand",
  CAD: "Canadian Dollar", AUD: "Australian Dollar", INR: "Indian Rupee",
  JPY: "Japanese Yen", AED: "UAE Dirham",
}

interface ExchangeRate {
  base_currency: string
  quote_currency: string
  rate: number
  fetched_at: string | null
  provider: string | null
}

interface CurrencySettings {
  base: string
  checkout: string
  display: string[]
  available: string[]
}

const money = (v: number | null | undefined): string => {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n)) return "—"
  return n < 0 ? "-$" + Math.abs(n).toFixed(4) : "$" + n.toFixed(4)
}

export function MarketplaceCurrencyTab() {
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [settings, setSettings] = useState<CurrencySettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState("")
  const [noticeTone, setNoticeTone] = useState<"success" | "warn" | "info">("info")

  // Manual rate override form
  const [rateForm, setRateForm] = useState<{
    quote_currency: string
    rate: string
    provider: string
  }>({ quote_currency: "NGN", rate: "", provider: "manual" })

  const load = useCallback(async () => {
    setLoading(true)
    setNotice("")
    try {
      const [rRes, sRes] = await Promise.all([
        fetch("/admin/marketplace/api?section=exchange-rates").then((r) => r.json()),
        fetch("/admin/marketplace/api?section=market-settings").then((r) => r.json()),
      ])
      if (rRes?.error) throw new Error(rRes.error)
      setRates(Array.isArray(rRes?.rates) ? rRes.rates : [])
      const cur = sRes?.currency || {}
      setSettings({
        base: cur.base || "USD",
        checkout: cur.checkout || "USD",
        display: Array.isArray(cur.display) ? cur.display : MARKET_CURRENCIES,
        available: Array.isArray(cur.available) ? cur.available : MARKET_CURRENCIES,
      })
    } catch {
      setNoticeTone("warn")
      setNotice("Could not load currency settings.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Realtime: refresh when exchange rates or currency settings change.
  useEffect(() => {
    const supabase = createClient()
    const ch = supabase
      .channel(`admin_market_currency_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_exchange_rates" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load])

  const rateByQuote = new Map(rates.map((r) => [r.quote_currency, r]))

  const saveRate = async () => {
    const quote = rateForm.quote_currency.trim().toUpperCase().slice(0, 3)
    const rate = Number(rateForm.rate)
    if (!quote) {
      setNoticeTone("warn")
      setNotice("Quote currency required.")
      return
    }
    if (!Number.isFinite(rate) || rate <= 0) {
      setNoticeTone("warn")
      setNotice("Rate must be > 0.")
      return
    }
    try {
      const r = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "exchange-rates-save",
          base_currency: "USD",
          quote_currency: quote,
          rate,
          provider: rateForm.provider.trim() || "manual",
        }),
      }).then((x) => x.json())
      if (r?.error) {
        setNoticeTone("warn")
        setNotice(r.error)
      } else {
        setNoticeTone("success")
        setNotice(`Rate for ${quote} updated.`)
        setRateForm({ quote_currency: "", rate: "", provider: "manual" })
        load()
      }
    } catch {
      setNoticeTone("warn")
      setNotice("Save failed.")
    }
  }

  const deleteRate = async (quote: string) => {
    if (!window.confirm(`Remove the ${quote} exchange rate?`)) return
    try {
      const r = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "exchange-rates-delete", base_currency: "USD", quote_currency: quote }),
      }).then((x) => x.json())
      if (r?.error) {
        setNoticeTone("warn")
        setNotice(r.error)
      } else {
        setNoticeTone("success")
        setNotice(`Rate for ${quote} removed.`)
        load()
      }
    } catch {
      setNoticeTone("warn")
      setNotice("Delete failed.")
    }
  }

  return (
    <div>
      <MarketPageBar
        icon={Globe}
        title="Currency"
        desc="Manage exchange rates (USD base) and the currencies shoppers can browse in. Checkout always settles in USD; display is converted for viewing only."
        badge={
          <MarketBadge tone="emerald" dot>
            USD base
          </MarketBadge>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 mb-3">
        <MarketKpi label="Base currency" value={settings?.base || "USD"} sub="All product costs stored here" icon={DollarSign} />
        <MarketKpi label="Checkout currency" value={settings?.checkout || "USD"} sub="What customers pay" />
        <MarketKpi label="Display currencies" value={settings?.display.length?.toString() || "0"} sub="Shoppers can switch" icon={Globe} />
      </div>

      {/* ---------- Manual rate overrides ---------- */}
      <div className={marketCardCls + " p-4 sm:p-5 mb-3"}>
        <MarketCardHead
          title="Manual exchange rates"
          desc="Override the USD → quote rate. Used when the automatic feed is stale or you want to pin a rate. Rates are quoted per 1 USD."
          icon={DollarSign}
        />
        <div className="grid gap-2 sm:grid-cols-4 mb-3">
          <MarketField label="Currency">
            <select
              value={rateForm.quote_currency}
              onChange={(e) => setRateForm({ ...rateForm, quote_currency: e.target.value })}
              className={marketInputCls}
            >
              {MARKET_CURRENCIES.filter((c) => c !== "USD").map((c) => (
                <option key={c} value={c}>
                  {c} — {CURRENCY_LABEL[c] || c}
                </option>
              ))}
            </select>
          </MarketField>
          <MarketField label="Rate (per $1)">
            <input
              value={rateForm.rate}
              onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })}
              type="number"
              step="0.0001"
              min="0"
              className={marketInputCls}
            />
          </MarketField>
          <MarketField label="Provider">
            <input
              value={rateForm.provider}
              onChange={(e) => setRateForm({ ...rateForm, provider: e.target.value })}
              className={marketInputCls}
            />
          </MarketField>
          <div className="flex items-end">
            <button onClick={saveRate} disabled={loading} className={marketBtnPrimaryCls}>
              {loading ? "Saving…" : "Save rate"}
            </button>
          </div>
        </div>
        {rates.length === 0 ? (
          <MarketEmpty icon={DollarSign} title="No rates" desc="Add a manual exchange rate to get started." />
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className={marketThCls}>Currency</th>
                  <th className={cn(marketThCls, "text-right")}>Rate (per $1)</th>
                  <th className={marketThCls}>Provider</th>
                  <th className={cn(marketThCls, "text-right")}>Fetched</th>
                  <th className={marketThCls} w-32>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MARKET_CURRENCIES.filter((c) => c !== "USD").map((c) => {
                  const r = rateByQuote.get(c)
                  return (
                    <tr key={c} className="hover:bg-slate-50/60 group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{c}</span>
                          <span className="ml-1 text-[11px] text-slate-400">{CURRENCY_LABEL[c] || c}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-right">
                        <span className={cn("font-bold", r ? "text-slate-900" : "text-slate-400")}>
                          {r ? money(r.rate) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{r?.provider || "—"}</td>
                      <td className="px-4 py-3 tabular-nums text-right text-slate-500">
                        {r?.fetched_at ? new Date(r.fetched_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 textRight">
                        {r ? (
                          <>
                            <button
                              onClick={() => {
                                setRateForm({ quote_currency: c, rate: r.rate.toString(), provider: r.provider || "manual" })
                              }}
                              className="mr-2 p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                              title="Edit rate"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteRate(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setRateForm({ quote_currency: c, rate: "", provider: "manual" })}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                            title="Add rate"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------- Display currency config (read-only summary, editable via settings) ---------- */}
      <div className={marketCardCls + " p-4 sm:p-5"}>
        <MarketCardHead
          title="Supported display currencies"
          desc="Shoppers pick their display currency; checkout always charges USD. Editable in Settings → Market settings."
          icon={Globe}
        />
        <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {MARKET_CURRENCIES.map((c) => {
            const enabled = settings?.display?.includes(c) ?? false
            const r = rateByQuote.get(c)
            return (
              <div key={c} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold">
                  {c}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-900 truncate">{CURRENCY_LABEL[c] || c}</span>
                  <span className="text-[10px] text-slate-500">
                    {enabled ? "enabled" : "hidden"} · {r ? `$1 = ${money(r.rate)}` : "no rate"}
                  </span>
                </div>
                <span className={cn("ml-auto shrink-0", enabled ? "text-emerald-600" : "text-slate-400")}>
                  {enabled ? "✓" : "—"}
                </span>
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          Tip: automatic exchange-rate updates write to `marketplace_exchange_rates` (base USD). Manual
          overrides above take effect immediately on every price surface.
        </p>
      </div>

      {notice && <MarketNotice tone={noticeTone}>{notice}</MarketNotice>}
    </div>
  )
}
