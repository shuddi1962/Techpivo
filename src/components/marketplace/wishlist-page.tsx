"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Heart, ShoppingCart } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { addToCart } from "@/lib/marketplace-cart"

const WISH_KEY = "tp_market_wish_v1"

interface Row {
  id: string
  product_name: string
  product_image_url: string | null
  sale_price: number | null
  original_price: number | null
  program_key: string | null
}

export function WishlistPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ids: string[] = []
    try {
      const raw = window.localStorage.getItem(WISH_KEY)
      ids = raw ? (JSON.parse(raw) as string[]) : []
    } catch {
      ids = []
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      setLoading(false)
      return
    }
    const supabase = createClient()
    supabase
      .from("affiliate_products")
      .select("id,product_name,product_image_url,sale_price,original_price,program_key")
      .in("id", ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)))
      .eq("is_active", true)
      .then(({ data }) => {
        setRows((data || []) as Row[])
        setLoading(false)
      })
  }, [])

  const remove = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
    try {
      const raw = window.localStorage.getItem(WISH_KEY)
      const ids = (raw ? JSON.parse(raw) : []) as string[]
      window.localStorage.setItem(WISH_KEY, JSON.stringify(ids.filter((x) => x !== id)))
    } catch {
      // ignore
    }
  }

  if (loading) {
    return <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center text-sm text-slate-500">Loading your wishlist...</div>
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center">
        <Heart className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="font-bold text-[#0F172A] text-lg">Your wishlist is empty</p>
        <p className="text-sm text-slate-500 mt-1">Tap the heart on any product to save it here.</p>
        <Link href="/marketplace" className="inline-block mt-4 bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-bold px-6 py-3 rounded-lg">
          Discover products
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5">
      <h1 className="text-xl font-extrabold text-[#0F172A] mb-4">Your Wishlist ({rows.length})</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {rows.map((p) => {
          const price = Number(p.sale_price ?? p.original_price ?? 0)
          return (
            <div key={p.id} className="group bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 relative">
              <button onClick={() => remove(p.id)} aria-label={`Remove ${p.product_name} from wishlist`} className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-[#EF4444] text-white flex items-center justify-center">
                <Heart className="h-4 w-4 fill-current" />
              </button>
              <Link href={`/marketplace/product/${p.id}`} className="block">
                <div className="aspect-square bg-white rounded-lg overflow-hidden mb-2">
                  {p.product_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.product_image_url} alt={p.product_name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : null}
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{p.program_key || "TechPivo Pick"}</p>
                <h3 className="text-sm font-semibold text-[#0F172A] line-clamp-1">{p.product_name}</h3>
                <p className="text-base font-bold text-[#0F172A] mt-1">${price.toFixed(2)}</p>
              </Link>
              <button onClick={() => addToCart(p.id, 1)} className="w-full mt-2 bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1">
                <ShoppingCart className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
