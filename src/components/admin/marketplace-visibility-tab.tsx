"use client"

// Admin → TechPivo Market → Visibility: the storefront publish switch.
// One card, one switch — changes apply instantly, no redeploy.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Globe, Pencil } from "lucide-react"
import {
  marketBtnDarkCls,
  marketBtnGhostCls,
  marketBtnPrimaryCls,
  marketCardCls,
  MarketBadge,
  MarketCardHead,
  MarketPageBar,
  MarketSkeletonRows,
} from "@/components/admin/marketplace-ui"
import { cn } from "@/lib/utils"

export function MarketplaceVisibilityTab() {
  const [published, setPublished] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    const r = await fetch("/admin/marketplace/api?section=overview", { cache: "no-store" })
      .then((x) => x.json())
      .catch(() => null)
    if (typeof r?.overview?.pagePublished === "boolean") setPublished(r.overview.pagePublished)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const toggle = async () => {
    if (published === null) return
    const next = !published
    setSaving(true)
    setNotice("")
    try {
      const res = await fetch("/admin/marketplace/api", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Update failed")
      setPublished(next)
      setNotice(next ? "Marketplace page is LIVE" : "Marketplace page hidden")
      load()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Update failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <MarketPageBar
        icon={Globe}
        title="Visibility"
        desc="Storefront publish switch — Admin → Pages → Marketplace"
        badge={
          published === null ? undefined : (
            <MarketBadge tone={published ? "emerald" : "neutral"} dot pulse={published}>
              {published ? "Published · live" : "Hidden"}
            </MarketBadge>
          )
        }
      />

      {loading ? (
        <MarketSkeletonRows rows={2} />
      ) : (
        <>
          {notice && (
            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {notice}
            </div>
          )}
          <div className={cn(marketCardCls, "p-4 sm:p-5")}>
            <MarketCardHead
              title="Storefront publish switch"
              desc="Controls whether /marketplace is published. The switch activates it instantly — no redeploy."
            />
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3">
              <p className="text-xs text-slate-500">Also editable in Admin → Pages → Marketplace</p>
              <div className="flex gap-2">
                <Link href="/admin/pages/marketplace" className={cn(marketBtnGhostCls, "text-xs px-3 py-2")}>
                  <Pencil className="h-3.5 w-3.5" /> Edit page
                </Link>
                <button
                  onClick={toggle}
                  disabled={saving}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-60",
                    published ? marketBtnDarkCls : marketBtnPrimaryCls
                  )}
                >
                  {saving ? "Saving…" : published ? "Hide store" : "Publish store"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
