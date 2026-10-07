"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, CreditCard, KeyRound, XCircle } from "lucide-react"

export function MarketplacePaymentsTab() {
  const [status, setStatus] = useState<{ secret: boolean; public: boolean; encryption?: boolean } | null>(null)
  const [secret, setSecret] = useState("")
  const [pub, setPub] = useState("")
  const [encryption, setEncryption] = useState("")
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
    if (!secret.trim() && !pub.trim() && !encryption.trim()) return
    setSaving(true)
    setNotice("")
    try {
      const r = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pay-save-keys", secret: secret.trim(), public: pub.trim(), encryption: encryption.trim() }),
      }).then((x) => x.json())
      if (r?.success) {
        setNotice("Korapay keys saved — checkout can now accept live payments.")
        setSecret("")
        setPub("")
        setEncryption("")
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
        <h2 className="font-bold text-slate-900">Korapay payments</h2>
      </div>
      {status ? (
        <p className="text-sm flex items-center gap-1.5 mb-3 text-slate-600">
          {status.secret ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-slate-400" />}
          Secret key: {status.secret ? "set" : "missing"}
          <span className="mx-1">·</span>
          {status.public ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-slate-400" />}
          Public key: {status.public ? "set" : "missing"}
          <span className="mx-1">·</span>
          {status.encryption ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-slate-400" />}
          Encryption: {status.encryption ? "set" : "missing"}
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
          <input value={secret} onChange={(e) => setSecret(e.target.value)} type="password" placeholder="Korapay secret key (sk_test_...)" className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
        </div>
        <div className="relative">
          <KeyRound className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={pub} onChange={(e) => setPub(e.target.value)} type="password" placeholder="Korapay public key (pk_test_... — optional)" className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
        </div>
        <div className="relative">
          <KeyRound className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={encryption} onChange={(e) => setEncryption(e.target.value)} type="password" placeholder="Korapay encryption key (optional)" className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
        </div>
        <button onClick={save} disabled={saving || (!secret.trim() && !pub.trim() && !encryption.trim())} className="bg-slate-900 text-white text-sm font-semibold rounded-lg px-4 py-2 disabled:opacity-50">
          {saving ? "Saving..." : "Save keys"}
        </button>
        {notice && <p className="text-sm text-slate-600 bg-slate-50 border rounded-lg px-3 py-2">{notice}</p>}
        <p className="text-xs text-slate-500">
          Get keys from Korapay Dashboard → Settings → API Configuration. Use <code>sk_test_</code>/<code>pk_test_</code> to trial checkout, then swap to live keys. Stored in <code>site_settings</code> (server-only reads). Set the webhook URL to <code>https://techpivo.com/api/marketplace/webhook</code> in the same dashboard page.
        </p>
      </div>
    </div>
  )
}
