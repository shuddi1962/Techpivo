"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, CreditCard, KeyRound, XCircle } from "lucide-react"

export function MarketplacePaymentsTab() {
  const [status, setStatus] = useState<{ secret: boolean; public: boolean } | null>(null)
  const [secret, setSecret] = useState("")
  const [pub, setPub] = useState("")
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")

  const load = async () => {
    const r = await fetch("/admin/marketplace/api?section=pay-status").then((x) => x.json()).catch(() => null)
    if (r?.status) setStatus(r.status)
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    if (!secret.trim() && !pub.trim()) return
    setSaving(true)
    setNotice("")
    try {
      const r = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pay-save-keys", secret: secret.trim(), public: pub.trim() }),
      }).then((x) => x.json())
      if (r?.success) {
        setNotice("Paystack keys saved — checkout can now accept live payments.")
        setSecret("")
        setPub("")
        load()
      } else {
        setNotice(r?.error || "Save failed.")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border rounded-xl p-4 sm:p-5 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="h-5 w-5 text-amber-600" />
        <h2 className="font-bold text-slate-900">Paystack payments</h2>
      </div>
      {status ? (
        <p className="text-sm flex items-center gap-1.5 mb-3 text-slate-600">
          {status.secret ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-slate-400" />}
          Secret key: {status.secret ? "set" : "missing"}
          <span className="mx-1">·</span>
          {status.public ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-slate-400" />}
          Public key: {status.public ? "set" : "missing"}
        </p>
      ) : (
        <p className="text-sm text-slate-500 mb-3">Checking keys...</p>
      )}
      {!status?.secret && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          Checkout is live but payments are disabled until the secret key is saved — customers will see “Card payments are not configured yet.”
        </p>
      )}
      <div className="space-y-2">
        <div className="relative">
          <KeyRound className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={secret} onChange={(e) => setSecret(e.target.value)} type="password" placeholder="Paystack secret key (sk_live_...)" className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
        </div>
        <div className="relative">
          <KeyRound className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={pub} onChange={(e) => setPub(e.target.value)} type="password" placeholder="Paystack public key (pk_live_... — optional)" className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
        </div>
        <button onClick={save} disabled={saving || (!secret.trim() && !pub.trim())} className="bg-slate-900 text-white text-sm font-semibold rounded-lg px-4 py-2 disabled:opacity-50">
          {saving ? "Saving..." : "Save keys"}
        </button>
        {notice && <p className="text-sm text-slate-600 bg-slate-50 border rounded-lg px-3 py-2">{notice}</p>}
        <p className="text-xs text-slate-500">
          Get keys from Paystack Dashboard → Settings → API Keys. Use <code>sk_test_</code>/<code>pk_test_</code> to trial checkout, then swap to live keys. Stored in <code>site_settings</code> (server-only reads).
        </p>
      </div>
    </div>
  )
}
