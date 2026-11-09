"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, CreditCard, ExternalLink, KeyRound, XCircle, DollarSign, Truck, Globe, Settings } from "lucide-react"
import {
  marketBtnDarkCls,
  marketCardCls,
  MarketBadge,
  MarketCardHead,
  MarketPageBar,
  marketIconInputCls,
  marketIconInputWrapCls,
  MarketLoading,
  MarketNotice,
} from "@/components/admin/marketplace-ui"
import { cn } from "@/lib/utils"
import { MARKET_CURRENCIES } from "@/lib/marketplace-pricing"
import { FX_CURRENCY_LABELS } from "@/lib/fx-shared"

interface PayStatus {
  secret: boolean
  public: boolean
  encryption?: boolean
  webhook?: boolean
  testMode?: boolean | null
}

const KEY_ROWS: Array<{ key: "secret" | "public" | "encryption" | "webhook"; label: string }> = [
  { key: "secret", label: "Secret key" },
  { key: "public", label: "Public key" },
  { key: "encryption", label: "Encryption key" },
  { key: "webhook", label: "Webhook hash" },
]

export function MarketplacePaymentsTab() {
  const [status, setStatus] = useState<PayStatus | null>(null)
  const [secret, setSecret] = useState("")
  const [pub, setPub] = useState("")
  const [encryption, setEncryption] = useState("")
  const [webhook, setWebhook] = useState("")
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")
  const [noticeTone, setNoticeTone] = useState<"success" | "warn" | "info">("info")
  const [loading, setLoading] = useState(true)

  // Currency & shipping settings
  const [settings, setSettings] = useState<{ currency: any; shipping: any } | null>(null)
  const [settingsSaving, setSettingsSaving] = useState(false)

  const loadSettings = async () => {
    try {
      const r = await fetch("/admin/marketplace/api?section=market-settings", { cache: "no-store" }).then((x) => x.json()).catch(() => null)
      if (r?.currency || r?.shipping) setSettings(r)
    } catch {
      // settings optional
    }
  }

  const saveSettings = async () => {
    if (!settings) return
    setSettingsSaving(true)
    setNotice("")
    try {
      const r = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "market-settings-save", currency: settings.currency, shipping: settings.shipping }),
      }).then((x) => x.json())
      if (r?.success) {
        setNoticeTone("success")
        setNotice("Currency & shipping settings saved — live on the storefront instantly.")
        setSettingsSaving(false)
      } else {
        setNoticeTone("warn")
        setNotice(r?.error || "Save failed.")
        setSettingsSaving(false)
      }
    } catch {
      setNoticeTone("warn")
      setNotice("Save failed.")
      setSettingsSaving(false)
    }
  }

  const load = async () => {
    const r = await fetch("/admin/marketplace/api?section=pay-status", { cache: "no-store" })
      .then((x) => x.json())
      .catch(() => null)
    if (r?.status) setStatus(r.status)
    setLoading(false)
  }

  useEffect(() => {
    load()
    loadSettings()
  }, [])

  const save = async () => {
    if (!secret.trim() && !pub.trim() && !encryption.trim() && !webhook.trim()) return
    setSaving(true)
    setNotice("")
    try {
      const r = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pay-save-keys", secret: secret.trim(), public: pub.trim(), encryption: encryption.trim(), webhook: webhook.trim() }),
      }).then((x) => x.json())
      if (r?.success) {
        setNoticeTone("success")
        setNotice(r?.validation?.message || "Payment keys saved — checkout can now accept live payments.")
        setSecret("")
        setPub("")
        setEncryption("")
        setWebhook("")
        load()
      } else {
        setNoticeTone("warn")
        setNotice(r?.error || "Save failed.")
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <MarketLoading label="Checking gateway keys..." />

  const live = !!status?.secret && status.testMode === false

  return (
    <div className="max-w-3xl">
      <MarketPageBar
        icon={CreditCard}
        title="Payments"
        desc="Gateway keys & mode — checkout stays disabled until the secret key is set"
        badge={
          status?.secret && status.testMode !== null && status.testMode !== undefined ? (
            <MarketBadge tone={status.testMode ? "amber" : "emerald"} dot pulse={!status.testMode}>
              {status.testMode ? "Test mode" : "Live"}
            </MarketBadge>
          ) : (
            <MarketBadge tone="neutral" dot>
              Not configured
            </MarketBadge>
          )
        }
      />

      {notice && <MarketNotice tone={noticeTone}>{notice}</MarketNotice>}

      {!status?.secret && (
        <MarketNotice tone="warn">
          Checkout is live but payments are disabled until the secret key is saved — customers will see
          “Card payments are not configured yet.”
        </MarketNotice>
      )}
      {status?.secret && status.testMode && (
        <MarketNotice tone="warn">
          Test mode is active — use test cards only. Swap in live keys when ready to accept real payments.
        </MarketNotice>
      )}
      {live && (
        <MarketNotice tone="success">
          Live keys active — every paid checkout settles to your account in real money.
        </MarketNotice>
      )}
      {status?.secret && !status?.webhook && (
        <MarketNotice tone="info">
          <strong>Webhooks are not set up yet.</strong> Without the Secret Hash, orders are only confirmed when the
          buyer returns from the payment page. Copy the “Secret Hash” from your Flutterwave dashboard
          (Settings → API Keys) into the webhook field below and point the webhook URL at
          <code className="rounded bg-slate-200/70 px-1">https://techpivo.com/api/marketplace/webhook</code>.
        </MarketNotice>
      )}

      <div className={cn(marketCardCls, "mb-3 p-4 sm:p-5")}>
        <MarketCardHead title="Key status" desc="Which gateway credentials are stored server-side." />
        <div className="grid gap-2 sm:grid-cols-2">
          {KEY_ROWS.map((row) => {
            const set = !!status?.[row.key]
            return (
              <div
                key={row.key}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3 py-2.5",
                  set ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-slate-50/60"
                )}
              >
                {set ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-slate-300" />
                )}
                <div className="leading-tight">
                  <p className="text-sm font-bold text-slate-800">{row.label}</p>
                </div>
                <MarketBadge tone={set ? "emerald" : "neutral"} className="ml-auto">
                  {set ? "Set" : "Missing"}
                </MarketBadge>
              </div>
            )
          })}
        </div>
      </div>

      <div className={cn(marketCardCls, "p-4 sm:p-5")}>
        <MarketCardHead title="Update keys" desc="Paste test keys to trial checkout, then swap to live keys." />
        <div className="space-y-2">
          <div className={marketIconInputWrapCls}>
            <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={secret} onChange={(e) => setSecret(e.target.value)} type="password" placeholder="Secret key (test keys contain _TEST)" className={marketIconInputCls} autoComplete="off" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className={marketIconInputWrapCls}>
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={pub} onChange={(e) => setPub(e.target.value)} type="password" placeholder="Public key (optional)" className={marketIconInputCls} autoComplete="off" />
            </div>
            <div className={marketIconInputWrapCls}>
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={encryption} onChange={(e) => setEncryption(e.target.value)} type="password" placeholder="Encryption key (optional)" className={marketIconInputCls} autoComplete="off" />
            </div>
          </div>
          <div className={marketIconInputWrapCls}>
            <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={webhook} onChange={(e) => setWebhook(e.target.value)} type="password" placeholder="Webhook secret hash (optional — verifies payment notifications)" className={marketIconInputCls} autoComplete="off" />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button onClick={save} disabled={saving || (!secret.trim() && !pub.trim() && !encryption.trim() && !webhook.trim())} className={marketBtnDarkCls}>
              {saving ? "Saving..." : "Save keys"}
            </button>
            <a
              href="/marketplace/checkout"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:underline"
            >
              Test the live checkout <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="pt-1 text-xs leading-relaxed text-slate-500">
            Paste test keys to trial checkout, then swap to live keys. Every key is stored in the server-only
            <code className="rounded bg-slate-100 px-1">site_secrets</code> table — never in a publicly readable
            setting, so nobody can copy your keys. The secret key is verified against the gateway the moment you save
            it, so a typo can never silently break checkout. Point your payment dashboard webhook at
            <code className="rounded bg-slate-100 px-1">https://techpivo.com/api/marketplace/webhook</code>.
          </p>
          </div>
        </div>

      <div className={cn(marketCardCls, "mt-3 p-4 sm:p-5")}>
        <MarketPageBar
          icon={Settings}
          title="Currency & shipping"
          desc="USD is the base and checkout currency. Display currencies and the free-shipping threshold are editable."
        />
        {notice && <MarketNotice tone={noticeTone}>{notice}</MarketNotice>}
        {settings ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border px-3 py-2.5 bg-slate-50/60">
                <p className="text-xs text-slate-500">Base currency</p>
                <p className="text-sm font-bold text-slate-800">USD</p>
                <p className="text-[10px] text-slate-400">Product prices are stored in USD.</p>
              </div>
              <div className="rounded-xl border px-3 py-2.5 bg-slate-50/60">
                <p className="text-xs text-slate-500">Checkout currency</p>
                <p className="text-sm font-bold text-slate-800">USD</p>
                <p className="text-[10px] text-slate-400">Flutterwave charges the USD order total.</p>
              </div>
              <div className="rounded-xl border px-3 py-2.5 bg-slate-50/60">
                <p className="text-xs text-slate-500">FX provider</p>
                <p className="text-sm font-bold text-slate-800">Live rates</p>
                <p className="text-[10px] text-slate-400">Cached 6h; static fallback if unreachable.</p>
              </div>
            </div>

            <div className="rounded-xl border p-3">
              <p className="text-xs font-bold text-slate-700 mb-3 block">Display currencies (shoppers can switch)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {MARKET_CURRENCIES.map((code) => {
                  const on = settings.currency.available.includes(code)
                  return (
                    <label key={code} className="cursor-pointer">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => {
                          const next = on
                            ? settings.currency.available.filter((c: string) => c !== code)
                            : [...settings.currency.available, code]
                          setSettings({ ...settings, currency: { ...settings.currency, available: next } })
                        }}
                        className="h-3.5 w-3.5 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                      />
                      <span className="ml-1.5 text-sm">{`${code} — ${FX_CURRENCY_LABELS[code] || code}`}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="rounded-xl border p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-700">Free shipping threshold</p>
                <span className="text-xs text-slate-400">USD · orders at/above ship free</span>
              </div>
              <input
                type="number"
                value={settings.shipping.freeShipThresholdUsd ?? 35}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  setSettings({ ...settings, shipping: { ...settings.shipping, freeShipThresholdUsd: Number.isFinite(v) ? v : 35 } })
                }}
                min="0"
                step="1"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button onClick={saveSettings} disabled={settingsSaving} className={marketBtnDarkCls}>
                {settingsSaving ? "Saving..." : "Save currency & shipping settings"}
              </button>
              <a
                href="/marketplace"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:underline"
              >
                View storefront <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="pt-1 text-xs leading-relaxed text-slate-500">
              Changing the threshold re-prices Standard shipping in cart and checkout immediately. CJ courier rates
              (+35% markup) are unaffected — they are quoted live per destination.
            </p>
          </div>
        ) : (
          <MarketLoading label="Loading settings…" />
        )}
      </div>
    </div>
  )
}
