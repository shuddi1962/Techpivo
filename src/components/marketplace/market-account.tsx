"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  Heart, LogOut, PackageSearch, ReceiptText, Settings2, ShoppingBag, ShoppingCart,
  Sparkles, Store, Tag, Truck, UserRound, Clock, User, ArrowLeftRight, Home,
} from "lucide-react"
import { cartCount as countLines, useMarketCart } from "@/lib/marketplace-cart"
import { marketImage } from "@/lib/marketplace-images"
import { MarketPrice } from "./market-price"

const WISH_KEY = "tp_market_wish_v1"
const RECENT_KEY = "tp_market_recent_v1"

interface RecentRow {
  id: string
  product_name: string
  product_image_url: string | null
  sale_price: number | null
  original_price: number | null
}

interface MyOrder {
  paystack_reference: string
  status: string
  paystack_status: string | null
  total_ngn: number | null
  total_usd: number | null
  items: Array<{ name: string; qty: number; unit_usd: number }> | null
  created_at: string
  ship_city: string | null
  ship_country: string | null
}

function readIds(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key)
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}

const SHORTCUTS = [
  { label: "Track Order", desc: "Live delivery status", href: "/marketplace/track", icon: Truck },
  { label: "Your Wishlist", desc: "Saved for later", href: "/marketplace/wishlist", icon: Heart },
  { label: "Your Cart", desc: "Ready to checkout", href: "/marketplace/cart", icon: ShoppingCart },
  { label: "Shop All", desc: "Every product", href: "/marketplace/shop", icon: Store },
  { label: "Deals of the Day", desc: "Biggest price drops", href: "/marketplace/deals", icon: Tag },
  { label: "New Arrivals", desc: "Fresh this week", href: "/marketplace/new-arrivals", icon: Sparkles },
]

export function MarketAccount() {
  const router = useRouter()
  const cart = useMarketCart()
  const [name, setName] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [wishCount, setWishCount] = useState(0)
  const [recent, setRecent] = useState<RecentRow[]>([])
  const [orders, setOrders] = useState<MyOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!alive) return
        if (user) {
          let full: string | null = null
          try {
            const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
            full = (data as { full_name?: string | null } | null)?.full_name || null
          } catch {
            // ignore
          }
          if (!alive) return
          const meta = (user.user_metadata || {}) as Record<string, unknown>
          setName(
            full ||
            (typeof meta.full_name === "string" && meta.full_name ? meta.full_name : null) ||
            user.email?.split("@")[0] ||
            "Shopper"
          )
          setEmail(user.email || null)
        }
        setAuthChecked(true)
        if (user?.email) {
          setOrdersLoading(true)
          fetch("/api/marketplace/orders/mine")
            .then((r) => r.json())
            .then((d) => {
              if (alive && Array.isArray(d?.orders)) setOrders(d.orders as MyOrder[])
            })
            .catch(() => {})
            .finally(() => {
              if (alive) setOrdersLoading(false)
            })
        }
        setWishCount(readIds(WISH_KEY).length)
        const ids = readIds(RECENT_KEY).slice(0, 4)
        if (ids.length > 0) {
          const { data } = await supabase
            .from("affiliate_products")
            .select("id,product_name,product_image_url,sale_price,original_price")
            .in("id", ids)
          if (alive && data) {
            const byId = new Map((data as RecentRow[]).map((r) => [r.id, r]))
            setRecent(ids.map((id) => byId.get(id)).filter((r): r is RecentRow => !!r))
          }
        }
      } catch {
        if (alive) setAuthChecked(true)
      }
    })()
    const sync = () => setWishCount(readIds(WISH_KEY).length)
    window.addEventListener("storage", sync)
    window.addEventListener("focus", sync)
    return () => {
      alive = false
      window.removeEventListener("storage", sync)
      window.removeEventListener("focus", sync)
    }
  }, [])

  const signOut = async () => {
    setSigningOut(true)
    try {
      const { createClient } = await import("@/lib/supabase/client")
      await createClient().auth.signOut()
    } catch {
      // ignore
    } finally {
      window.location.assign("/marketplace")
    }
  }

  const cartQty = countLines(cart)

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-3 sm:px-6 lg:px-8">
      {/* greeting — premium hero band */}
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1e293b 55%, #0F172A 100%)" }}>
        <div className="absolute inset-0 -z-10 opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle at 80% -10%, rgba(255,107,0,0.15), transparent 50%)" }} />
        {!authChecked ? (
          <div className="animate-pulse relative z-10">
            <div className="h-7 w-56 rounded bg-white/10" />
            <div className="mt-2 h-4 w-80 max-w-full rounded bg-white/10" />
          </div>
        ) : name ? (
          <div className="relative z-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-full sm:max-w-[64%]">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF6B00]">TechPivo Market</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Hi, {name.split(" ")[0]} 👋</h1>
              <p className="mt-1 text-sm text-white/80 max-w-xs">{email || "Welcome back to your market account."}</p>
            </div>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0F172A] shadow-sm transition-all duration-200 hover:bg-[#FF6B00] hover:text-white disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" /> {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-full sm:max-w-[64%]">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF6B00]">TechPivo Market</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Your Market Dashboard</h1>
              <p className="mt-1 text-sm text-white/80 max-w-xs">Sign in to sync your wishlist, track orders, and checkout in seconds.</p>
            </div>
            <div className="flex gap-2.5">
              <Link
                href="/login"
                className="rounded-xl bg-[#FF6B00] px-5 py-2.5 text-sm font-bold text-[#0F172A] shadow-sm transition-all duration-200 hover:bg-[#e86000] hover:-translate-y-0.5"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white hover:text-[#0F172A]"
              >
                Create account
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* live stats dashboard */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-label="Account stats">
        {[
          { label: "Cart items", value: String(cartQty), href: "/marketplace/cart", icon: ShoppingCart, color: "#FF6B00" },
          { label: "Wishlist", value: String(readIds(WISH_KEY).length), href: "/marketplace/wishlist", icon: Heart, color: "#EF4444" },
          { label: "Orders", value: ordersLoading ? "–" : String(orders.length), href: "/marketplace/track", icon: ReceiptText, color: "#1668DC" },
          { label: "Viewed", value: String(recent.length), href: "/marketplace", icon: PackageSearch, color: "#059669" },
        ].map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-[#FF6B00]/40"
          >
            <div className="absolute inset-x-0 bottom-0 h-[3px] bg-[#FF6B00]/20 group-hover:bg-[#FF6B00]/80 transition-colors" />
            <div className="relative z-10 flex items-center gap-2">
              <s.icon className="h-6 w-6 shrink-0 rounded-xl bg-[#F8FAFC] p-1.5 text-[#FF6B00] shadow-sm group-hover:bg-[#FF6B00] group-hover:text-white transition-colors duration-200" />
              <span className="ml-auto text-[10px] font-bold tracking-wider text-slate-300 group-hover:text-[#FF6B00]">{s.label}</span>
            </div>
            <p className="mt-4 text-2xl font-extrabold tabular-nums text-[#0F172A] group-hover:text-[#FF6B00] transition-colors duration-200">{s.value}</p>
          </Link>
        ))}
      </section>

      {/* my orders */}
      <section className="rounded-3xl border border-[#E2E8F0] bg-white p-6 sm:p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-[#FF6B00]" />
            <h2 className="text-lg font-bold text-[#0F172A]">My Orders</h2>
          </div>
          <Link href="/marketplace/track" className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2 text-sm font-bold text-[#0F172A] shadow-sm transition-all duration-200 hover:bg-white hover:border-[#FF6B00] hover:text-[#FF6B00]">
            Track All →
          </Link>
        </div>
        {!authChecked || ordersLoading ? (
          <div className="h-48 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E2E8F0] bg-[#F8FAFC]">
            <PackageSearch className="h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">Loading your orders…</p>
          </div>
        ) : !email ? (
          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-8 text-center">
            <UserRound className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-[#0F172A]">Sign in to see your orders</p>
            <p className="mt-1 text-sm text-slate-500">Your order history appears here once you sign in with your purchase email.</p>
            <Link
              href="/login"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#FF6B00] px-5 py-2.5 text-sm font-bold text-[#0F172A] shadow-sm transition-all duration-200 hover:bg-[#e86000]"
            >
              <User className="h-4 w-4" /> Sign in
            </Link>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-8 text-center">
            <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-[#0F172A]">No orders yet</p>
            <p className="mt-1 text-sm text-slate-500">When you check out, your orders will live here with live tracking.</p>
            <Link
              href="/marketplace"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-black hover:-translate-y-0.5"
            >
              <Home className="h-4 w-4" /> Start Shopping
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[#E2E8F0]">
            {orders.map((o) => {
              const itemCount = Array.isArray(o.items) ? o.items.reduce((s, it) => s + (Number(it.qty) || 0), 0) : 0
              return (
                <li key={o.paystack_reference} className="pt-5 pb-5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 md:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#0F172A]">#{o.paystack_reference.slice(-8)}</p>
                      <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-1.5">
                        <span>{new Date(o.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
                        {itemCount > 0 && `· ${itemCount} item${itemCount === 1 ? "" : "s"}`}
                        {o.ship_city && `· ${o.ship_city}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase border-amber-100 bg-amber-50 text-amber-700">
                        {o.status}
                      </span>
                      <MarketPrice usd={Number(o.total_usd ?? 0)} className="text-sm font-extrabold tabular-nums text-[#0F172A]" />
                    </div>
                    <Link
                      href={`/marketplace/track?reference=${encodeURIComponent(o.paystack_reference)}&email=${encodeURIComponent(email ?? "")}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:bg-black"
                    >
                      Track <ArrowLeftRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* shortcuts — every tile works */}
      <section className="rounded-3xl border border-[#E2E8F0] bg-white p-6 sm:p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#0F172A]">
            <Sparkles className="h-5 w-5 text-[#FF6B00]" />
            Quick Actions
          </h2>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SHORTCUTS.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:p-5 shadow-sm transition-all duration-200 hover:bg-white hover:border-[#FF6B00]/50 hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm transition-all duration-200 group-hover:bg-[#FF6B00] group-hover:text-white">
                <s.icon className="h-5 w-5 text-[#B45309] group-hover:text-white transition-colors duration-200" />
              </span>
              <span className="block truncate text-sm font-bold text-[#0F172A] group-hover:text-[#FF6B00] transition-colors">{s.label}</span>
              <span className="block truncate text-[11px] text-slate-400">{s.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* recently viewed */}
      {recent.length > 0 && (
        <section className="rounded-3xl border border-[#E2E8F0] bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#0F172A]">
              <Clock className="h-5 w-5 text-[#FF6B00]" />
              Recently Viewed
            </h2>
            <Link href="/marketplace" className="text-sm font-bold text-[#FF6B00] hover:text-[#e86000] transition-colors">
              Browse All →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {recent.map((r) => (
              <Link
                key={r.id}
                href={`/marketplace/product/${r.id}`}
                className="group flex flex-col items-center gap-2"
              >
                <span className="block aspect-square overflow-hidden rounded-xl bg-white border border-[#E2E8F0] shadow-sm transition-all duration-200 group-hover:border-[#FF6B00] group-hover:shadow-md">
                  {r.product_image_url ? (
                    <img
                      src={marketImage(r.product_image_url)}
                      alt={r.product_name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        const t = e.currentTarget
                        t.src = ""
                        t.style.display = "none"
                      }}
                    />
                  ) : null}
                </span>
                <span className="block truncate text-[12px] font-semibold text-[#0F172A] group-hover:text-[#FF6B00] transition-colors">{r.product_name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* general account links */}
      <section className="rounded-3xl border border-[#E2E8F0] bg-white p-6 sm:p-8 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[#0F172A]">
          <Settings2 className="h-5 w-5 text-[#FF6B00]" />
          Account Settings
        </h2>
        <p className="mt-1 text-sm text-slate-500">Profile, security, notifications and community settings live in your main TechPivo account — same login.</p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/account"
            className="group flex items-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-bold text-[#0F172A] shadow-sm transition-all duration-200 hover:bg-[#FF6B00]/10 hover:border-[#FF6B00]/40 hover:text-[#FF6B00]"
          >
            <Settings2 className="h-4 w-4 shrink-0 text-[#FF6B00] group-hover:text-white" />
            <span>Open full account</span>
          </Link>
          <Link
            href="/marketplace/track"
            className="group flex items-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-bold text-[#0F172A] shadow-sm transition-all duration-200 hover:bg-[#FF6B00]/10 hover:border-[#FF6B00]/40 hover:text-[#FF6B00]"
          >
            <ShoppingBag className="h-4 w-4 shrink-0 text-[#FF6B00] group-hover:text-white" />
            <span>My Orders</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
