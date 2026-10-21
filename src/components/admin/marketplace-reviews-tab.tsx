"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ExternalLink, MessageSquare, Star, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  marketCardCls,
  marketIconBtnDangerCls,
  MarketBadge,
  MarketEmpty,
  MarketKpi,
  MarketLoading,
  MarketNotice,
  MarketPageBar,
  MarketSearch,
  MarketSegmented,
  MarketToolbar,
} from "@/components/admin/marketplace-ui"
import { cn } from "@/lib/utils"

interface ReviewRow {
  id: string
  product_id: string
  product_name: string
  author_name: string
  rating: number
  title: string | null
  comment: string | null
  created_at: string
}

export function MarketplaceReviewsTab() {
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [minRating, setMinRating] = useState(0)
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    const r = await fetch("/admin/marketplace/api?section=reviews").then((x) => x.json()).catch(() => null)
    if (r?.reviews) setReviews(r.reviews as ReviewRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const supabase = createClient()
    const ch = supabase
      .channel(`admin_market_reviews_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_reviews" }, () => load())
      .subscribe()
    const poll = setInterval(load, 30000)
    const onFocus = () => load()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
      supabase.removeChannel(ch)
    }
  }, [load])

  const flash = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(""), 3000)
  }

  const remove = async (r: ReviewRow) => {
    if (!confirm(`Delete this ${r.rating}-star review on "${r.product_name}"?`)) return
    const res = await fetch("/admin/marketplace/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "review-delete", id: r.id }),
    })
    if (res.ok) {
      setReviews((prev) => prev.filter((x) => x.id !== r.id))
      flash("Review deleted")
    } else {
      flash("Delete failed")
    }
  }

  const q = query.trim().toLowerCase()
  const shown = reviews.filter(
    (r) =>
      (minRating === 0 || r.rating <= minRating) &&
      (!q ||
        r.product_name.toLowerCase().includes(q) ||
        r.author_name.toLowerCase().includes(q) ||
        (r.comment || "").toLowerCase().includes(q) ||
        (r.title || "").toLowerCase().includes(q))
  )
  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  const lowCount = reviews.filter((r) => r.rating <= 2).length

  const ratingOptions = [
    { value: "0", label: "All ratings", count: reviews.length },
    { value: "1", label: "1 star", count: reviews.filter((r) => r.rating === 1).length },
    { value: "2", label: "2 stars & below", count: reviews.filter((r) => r.rating <= 2).length },
    { value: "3", label: "3 stars & below", count: reviews.filter((r) => r.rating <= 3).length },
  ]

  if (loading) {
    return <MarketLoading label="Loading reviews..." />
  }

  return (
    <div>
      <MarketPageBar
        icon={MessageSquare}
        title="Reviews"
        desc="Ratings & moderation — new reviews land here live for approval or removal"
        badge={
          lowCount > 0 ? (
            <MarketBadge tone="red" dot>
              {lowCount} need attention
            </MarketBadge>
          ) : undefined
        }
      />
      {notice && <MarketNotice>{notice}</MarketNotice>}

      <div className="mb-3 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <MarketKpi label="Total reviews" value={String(reviews.length)} sub="all time" tone="neutral" />
        <MarketKpi
          label="Average rating"
          value={reviews.length > 0 ? avg.toFixed(1) : "—"}
          sub={reviews.length > 0 ? "out of 5 stars" : "no ratings yet"}
          tone="amber"
        />
        <MarketKpi label="Needs attention" value={String(lowCount)} sub="1–2 star reviews" tone={lowCount > 0 ? "red" : "emerald"} />
        <MarketKpi label="5-star reviews" value={String(reviews.filter((r) => r.rating >= 5).length)} sub="happy shoppers" tone="emerald" />
      </div>

      <MarketToolbar
        left={
          <>
            <MarketSearch value={query} onChange={setQuery} placeholder="Search product, author, text..." />
            <MarketSegmented
              options={ratingOptions}
              value={String(minRating)}
              onChange={(v) => setMinRating(Number(v))}
            />
          </>
        }
        right={
          <span className="text-xs font-semibold tabular-nums text-slate-500">
            {shown.length} of {reviews.length} shown
          </span>
        }
      />
      {shown.length === 0 ? (
        <MarketEmpty
          icon={MessageSquare}
          title={reviews.length === 0 ? "No customer reviews yet" : "No reviews match your filters"}
          desc={
            reviews.length === 0
              ? "They appear here live as shoppers post them — nothing to moderate until then."
              : "Try a different search term or rating filter."
          }
        />
      ) : (
        <div className="grid gap-2.5">
          {shown.map((r) => (
            <div key={r.id} className={marketCardCls + " p-4"}>
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold",
                    r.rating >= 4 ? "bg-emerald-50 text-emerald-600" : r.rating === 3 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                  )}
                >
                  {r.rating}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="flex items-center gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                      ))}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{r.author_name}</span>
                    <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <Link
                    href={`/marketplace/product/${r.product_id}`}
                    target="_blank"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
                  >
                    {r.product_name} <ExternalLink className="h-3 w-3" />
                  </Link>
                  {r.title && <p className="mt-1 text-sm font-semibold text-slate-800">{r.title}</p>}
                  {r.comment && <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{r.comment}</p>}
                </div>
                <button
                  title="Delete review"
                  aria-label={`Delete review by ${r.author_name}`}
                  onClick={() => remove(r)}
                  className={marketIconBtnDangerCls + " shrink-0"}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {shown.length > 0 && (
        <p className="mt-3 text-center text-[11px] text-slate-400">
          List refreshes live · every 30s · on window focus
        </p>
      )}
    </div>
  )
}
