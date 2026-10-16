"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, CreditCard, ExternalLink, KeyRound, XCircle } from "lucide-react"
import {
  marketBtnDarkCls,
  marketCardCls,
  MarketHeader,
  marketIconInputCls,
  marketIconInputWrapCls,
  MarketLoading,
  MarketNotice,
} from "@/components/admin/marketplace-ui"
import { cn } from "@/lib/utils"

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
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const r = await fetch("/admin/marketplace/api?section=pay-status", { cache: "no-store" })
      .then((x) => x.json())
      .catch(() => null)
    if (r?.status) setStatus(r.status)
    setLoading(false)
  }

  useEffect(() => {
    load()
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
        setNotice("Payment keys saved — checkout can now accept live payments.")
        setSecret("")
        setPub("")
        setEncryption("")
        setWebhook("")
        load()
      } else {
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
      <MarketHeader
        icon={CreditCard}
        title="Payments"
        desc="Gateway keys & mode — checkout stays disabled until the secret key is set"
        actions={
          status?.secret && status.testMode !== null && status.testMode !== undefined ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold",
                status.testMode ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", status.testMode ? "bg-amber-500" : "bg-emerald-500 animate-pulse")} />
              {status.testMode ? "TEST MODE" : "LIVE"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> NOT CONFIGURED
            </span>
          )
        }
      />

      {notice && <MarketNotice tone={notice.startsWith("Payment keys saved") ? "success" : "info"}>{notice}</MarketNotice>}

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

      <div className={cn(marketCardCls, "mb-3 p-4 sm:p-5")}>
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">Key status</p>
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
                  <p className={cn("text-[11px] font-semibold", set ? "text-emerald-600" : "text-slate-400")}>
                    {set ? "Set" : "Missing"}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className={cn(marketCardCls, "p-4 sm:p-5")}>
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">Update keys</p>
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
            Paste test keys to trial checkout, then swap to live keys. Stored in{" "}
            <code className="rounded bg-slate-100 px-1">site_settings</code> (server-only reads). Point your
            payment dashboard webhook at{" "}
            <code className="rounded bg-slate-100 px-1">https://techpivo.com/api/marketplace/webhook</code>.
          </p>
        </div>
      </div>
    </div>
  )
}
