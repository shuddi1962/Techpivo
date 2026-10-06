"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  Heart, LogOut, PackageSearch, Settings2, ShoppingBag, ShoppingCart,
  Sparkles, Store, Tag, Truck, UserRound,
} from "lucide-react"
import { cartCount as countLines, useMarketCart } from "@/lib/marketplace-cart"
import { marketImage } from "@/lib/marketplace-images"

const WISH_KEY = "tp_market_wish_v1"
const RECENT_KEY = "tp_market_recent_v1"

interface RecentRow {
  id: string
  product_name: string
  product_image_url: string | null
  sale_price: number | null
  original_price: number | null
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
        // Local shopper state (same keys the storefront writes everywhere).
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
    <div className="space-y-6">
      {/* greeting */}
      <section className="overflow-hidden rounded-2xl p-6 text-white sm:p-8" style={{ background: "linear-gradient(120deg, #23272E 0%, #14171C 100%)" }}>
        {!authChecked ? (
          <div className="animate-pulse">
            <div className="h-7 w-56 rounded bg-white/10" />
            <div className="mt-2 h-4 w-80 max-w-full rounded bg-white/10" />
          </div>
        ) : name ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#F59E0B]">TechPivo Market</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Hi, {name.split(" ")[0]} 👋</h1>
              <p className="mt-1 text-sm text-white/70">{email || "Welcome back to your market account."}</p>
            </div>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white hover:text-[#0F172A] disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" /> {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#F59E0B]">TechPivo Market</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Your market account</h1>
              <p className="mt-1 max-w-xl text-sm text-white/70">
                Sign in with your TechPivo account — the same login as the main site — to sync your
                wishlist, track orders faster and check out in seconds.
              </p>
            </div>
            <div className="flex gap-2.5">
              <Link
                href="/login"
                className="rounded-lg bg-[#F59E0B] px-5 py-2.5 text-sm font-bold text-[#0F172A] transition-colors hover:bg-[#D97706]"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#0F172A]"
              >
                Create account
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* live stats */}
      <section className="grid grid-cols-3 gap-3" aria-label="Account stats">
        {[
          { label: "Cart items", value: String(cartQty), href: "/marketplace/cart", icon: ShoppingCart },
          { label: "Wishlist", value: String(wishCount), href: "/marketplace/wishlist", icon: Heart },
          { label: "Recently viewed", value: String(recent.length), href: "/marketplace", icon: PackageSearch },
        ].map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <s.icon className="h-5 w-5 text-[#B45309]" />
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-[#0F172A]">{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 transition-colors group-hover:text-[#0F172A]">{s.label}</p>
          </Link>
        ))}
      </section>

      {/* shortcuts — every tile works */}
      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#0F172A]">Quick actions</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SHORTCUTS.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="group flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 transition-all hover:border-[#F59E0B] hover:bg-white hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#B45309] shadow-sm transition-colors group-hover:bg-[#0F172A] group-hover:text-white">
                <s.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-[#0F172A]">{s.label}</span>
                <span className="block truncate text-xs text-slate-500">{s.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* recently viewed */}
      {recent.length > 0 && (
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0F172A]">Recently viewed</h2>
            <Link href="/marketplace/shop" className="text-sm font-bold text-[#B45309] hover:text-[#D97706]">
              Shop all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {recent.map((r) => (
              <Link
                key={r.id}
                href={`/marketplace/product/${r.id}`}
                className="group rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 transition-colors hover:bg-slate-100"
              >
                <span className="block aspect-square overflow-hidden rounded-lg bg-white">
                  {r.product_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.product_image_url} alt={r.product_name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : null}
                </span>
                <span className="mt-2 block truncate text-[13px] font-semibold text-[#0F172A]">{r.product_name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* general account */}
      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[#0F172A]">
          <UserRound className="h-5 w-5 text-[#B45309]" /> General account
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Profile, security, notifications and community settings live in your main TechPivo account — same login.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-black"
          >
            <Settings2 className="h-4 w-4" /> Open full account
          </Link>
          <Link
            href="/account/security"
            className="rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm font-semibold text-[#0F172A] hover:bg-slate-50"
          >
            Security
          </Link>
          <Link
            href="/account/ads"
            className="rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm font-semibold text-[#0F172A] hover:bg-slate-50"
          >
            My Ads
          </Link>
          <Link
            href="/marketplace/track"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm font-semibold text-[#0F172A] hover:bg-slate-50"
          >
            <ShoppingBag className="h-4 w-4" /> My orders
          </Link>
        </div>
      </section>
    </div>
  )
}
