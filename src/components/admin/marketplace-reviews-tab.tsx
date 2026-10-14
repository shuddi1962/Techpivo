"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ExternalLink, RefreshCw, Search, Star, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

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

  if (loading) {
    return (
      <div className="bg-white border rounded-xl p-10 text-center text-sm text-slate-500">
        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-600" /> Loading reviews...
      </div>
    )
  }

  return (
    <div>
      {notice && (
        <div className="mb-3 text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2">{notice}</div>
      )}
      <div className="bg-white border rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3">
        <div>
          <p className="text-2xl font-bold text-slate-900">{reviews.length}</p>
          <p className="text-xs text-slate-500">Total reviews</p>
        </div>
        <div className="h-8 w-px bg-slate-200" />
        <div>
          <p className="text-2xl font-bold text-slate-900 flex items-center gap-1">
            {avg.toFixed(1)} <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          </p>
          <p className="text-xs text-slate-500">Average rating</p>
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product, author, text..."
            className="border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-amber-500 w-56"
          />
        </div>
        <select
          value={minRating}
          onChange={(e) => setMinRating(Number(e.target.value))}
          aria-label="Filter by rating"
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
        >
          <option value={0}>All ratings</option>
          <option value={1}>1 star only</option>
          <option value={2}>2 stars & below</option>
          <option value={3}>3 stars & below</option>
        </select>
      </div>
      {shown.length === 0 ? (
        <div className="bg-white border rounded-xl p-10 text-center text-sm text-slate-500">
          {reviews.length === 0 ? "No customer reviews yet — they appear here live as shoppers post them." : "No reviews match your filters."}
        </div>
      ) : (
        <div className="grid gap-3">
          {shown.map((r) => (
            <div key={r.id} className="bg-white border rounded-xl p-4">
              <div className="flex items-start gap-2">
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
                  {r.title && <p className="text-sm font-semibold text-slate-800 mt-1">{r.title}</p>}
                  {r.comment && <p className="text-sm text-slate-600 mt-0.5">{r.comment}</p>}
                </div>
                <button
                  title="Delete review"
                  onClick={() => remove(r)}
                  className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
