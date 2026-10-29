"use client"

// Admin → TechPivo Market → Google Feed.
// Merchant Center product feed management: endpoint URL, eligibility stats,
// last generation state, manual refresh and an affected-products report.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Copy, ExternalLink, RefreshCw } from "lucide-react"
import {
  marketBtnPrimaryCls,
  marketBtnGhostCls,
  marketCardCls,
  MarketBadge,
  MarketCardHead,
  MarketPageBar,
  MarketKpi,
  MarketSkeletonRows,
} from "@/components/admin/marketplace-ui"
import { cn } from "@/lib/utils"

interface FeedStat {
  feedUrl: string
  total: number
  active: number
  eligible: number
  excluded: number
  missingName: number
  missingImage: number
  badPrice: number
}

export function MarketplaceFeedTab() {
  const [stats, setStats] = useState<FeedStat | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [validating, setValidating] = useState(false)
  const [valid, setValid] = useState<boolean | null>(null)
  const [notice, setNotice] = useState("")

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(
        "/admin/marketplace/api?section=feed-stats",
        { cache: "no-store", headers: { Accept: "application/json" } }
      )
      const d = await r.json()
      if (r.ok && d) setStats(d as FeedStat)
      else setNotice(d?.error || "Failed to load feed stats")
    } catch {
      setNotice("Failed to load feed stats")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
    const t = setInterval(loadStats, 30000)
    return () => clearInterval(t)
  }, [loadStats])

  const copyUrl = () => {
    const url = stats?.feedUrl
    if (!url) return
    navigator.clipboard.writeText(url).then(() => {
      setNotice("Feed URL copied to clipboard")
      setTimeout(() => setNotice(""), 2000)
    })
  }

  const refreshFeed = async () => {
    // ISR revalidation: ask the server to regenerate the feed route cache so
    // the next public fetch returns fresh data. Best-effort — the route
    // revalidates hourly on its own regardless.
    setRefreshing(true)
    setNotice("")
    try {
      const r = await fetch("/api/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "/feeds/google-merchant-center" }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d?.error || "Refresh failed")
      setNotice("Feed refresh triggered (cache busted)")
      await loadStats()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Refresh failed")
    } finally {
      setRefreshing(false)
    }
  }

  const validateFeed = async () => {
    setValidating(true)
    setNotice("")
    try {
      const r = await fetch(stats?.feedUrl || "/feeds/google-merchant-center", {
        cache: "no-store",
        headers: { Accept: "application/rss+xml" },
      })
      const text = await r.text()
      const ok = r.ok && text.trim().startsWith("<?xml") && text.includes("<rss")
      setValid(ok)
      setNotice(ok ? "Feed validates — valid RSS + g: namespace" : "Feed did not return valid RSS")
    } catch {
      setValid(false)
      setNotice("Feed validation failed — could not reach endpoint")
    } finally {
      setValidating(false)
    }
  }

  if (loading) return <MarketSkeletonRows rows={4} />

  return (
    <div className="max-w-4xl">
      <MarketPageBar
        icon={RefreshCw}
        title="Google Merchant Center Feed"
        desc="Product feed for Google Merchant Center (account TechPivo Marketplace, 5891830255). Eligible products are published to the feed; ineligible listings are excluded and listed below."
        badge={
          stats ? (
            <MarketBadge tone="emerald" dot>
              {stats.eligible} of {stats.active} active products eligible
            </MarketBadge>
          ) : undefined
        }
      />

      {notice && (
        <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {notice}
        </div>
      )}

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MarketKpi
          label="Total products"
          value={String(stats?.total ?? 0)}
          sub="All catalogue rows"
        />
        <MarketKpi
          label="Active (eligible pool)"
          value={String(stats?.active ?? 0)}
          sub="is_active = true"
        />
        <MarketKpi
          label="Eligible for feed"
          value={String(stats?.eligible ?? 0)}
          sub="Has name + image + price"
        />
        <MarketKpi
          label="Excluded"
          value={String(stats?.excluded ?? 0)}
          sub="Missing required data"
          tone="amber"
        />
      </div>

      {/* Feed endpoint + actions */}
      <div className={marketCardCls + " mt-6 p-4 sm:p-5"}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Feed endpoint</span>
            <span className="text-sm text-slate-600 break-all truncate max-w-[220px]">{stats?.feedUrl}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyUrl}
              className={marketBtnGhostCls}
              title="Copy feed URL to clipboard"
            >
              <Copy className="h-4 w-4" /> Copy URL
            </button>
            <Link
              href={stats?.feedUrl || "/feeds/google-merchant-center"}
              target="_blank"
              rel="noopener noreferrer"
              className={marketBtnPrimaryCls}
              title="Open the live feed in a new tab"
            >
              <ExternalLink className="h-4 w-4 shrink-0" /> Open feed
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refreshFeed} disabled={refreshing} className={marketBtnGhostCls}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> {refreshing ? "Refreshing…" : "Refresh feed"}
          </button>
          <button onClick={validateFeed} disabled={validating} className={marketBtnGhostCls}>
            {validating ? "Validating…" : valid === null ? "Validate feed" : valid ? "Feed valid" : "Feed invalid"}
          </button>
          <p className="text-xs text-slate-500">
            The feed revalidates automatically every hour. Use Refresh to bust
            the ISR cache immediately after publishing/editing products.
          </p>
        </div>
      </div>

      {/* Eligibility report */}
      <div className={marketCardCls + " mt-6 p-4 sm:p-5"}>
        <MarketCardHead
          title="Feed eligibility report"
          desc="Products missing required Google Merchant Center data are excluded from the feed. Fix them in Admin → Marketplace → Products."
        />
        <div className="grid gap-2 sm:grid-cols-3 mt-3">
          <div className="border rounded-xl p-3 bg-[#F8FAFC]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Missing name</p>
            <p className="text-xl font-bold text-slate-800">{stats?.missingName ?? 0}</p>
          </div>
          <div className="border rounded-xl p-3 bg-[#F8FAFC]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Missing image</p>
            <p className="text-xl font-bold text-slate-800">{stats?.missingImage ?? 0}</p>
          </div>
          <div className="border rounded-xl p-3 bg-[#F8FAFC]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Invalid price</p>
            <p className="text-xl font-bold text-slate-800">{stats?.badPrice ?? 0}</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-500">
          Required Google attributes: id, title, description, link, image_link, availability, price, condition. Recommended:
          brand, mpn, product_type, shipping. GTINs are never fabricated — a product without a real identifier is excluded
          only when a required field is absent, and listed above so you can correct it.
        </p>

        <div className={cn(marketCardCls, "overflow-hidden mt-3")}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="pb-2 text-left w-1/3">Issue</th>
                <th className="pb-2 text-left">Products</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {[
                { issue: "Missing product name", count: stats?.missingName ?? 0 },
                { issue: "Missing product image", count: stats?.missingImage ?? 0 },
                { issue: "Missing or non-positive price", count: stats?.badPrice ?? 0 },
                { issue: "Eligible for feed", count: stats?.eligible ?? 0 },
              ].map((row) => (
                <tr key={row.issue} className="text-slate-700">
                  <td className="py-2 text-left">{row.issue}</td>
                  <td className="py-2 text-left tabular-nums font-semibold">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats?.missingName === 0 && stats?.missingImage === 0 && stats?.badPrice === 0 && (
            <p className="mt-3 text-sm text-slate-500">No feed-blocking issues — all active products are eligible.</p>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Setup: submit the feed URL above in Google Merchant Center → Products → Feeds → Add feed. Google must approve the
        feed separately — a valid feed does not guarantee listing approval. Advanced marketplace (sub-account /
        external_seller_id) account conversion, if required, is a manual Google Merchant Center step outside this codebase.
      </p>
    </div>
  )
}
