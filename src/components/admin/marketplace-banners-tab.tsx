"use client"

import { useEffect, useRef, useState } from "react"
import { BadgeCheck, ImagePlus, Loader2, RotateCcw, Save } from "lucide-react"
import { MARKET_DEPARTMENTS } from "@/lib/marketplace-categories"
import {
  BANNER_SLOTS,
  DEPT_BANNER_DIMS,
  EMPTY_BANNERS,
  type MarketBanners,
} from "@/lib/marketplace-banners"
import { MARKET_STORE_DEFAULTS } from "@/lib/marketplace-store"

function isUrl(v: string): boolean {
  return /^https?:\/\/.+/i.test(v.trim()) || v.trim().startsWith("/")
}

export function MarketplaceBannersTab() {
  const [banners, setBanners] = useState<MarketBanners>({ ...EMPTY_BANNERS, departments: {} })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [notice, setNotice] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadTarget, setUploadTarget] = useState<string | null>(null)
  // Store contact info (footer) — separate settings row, own save.
  const [store, setStore] = useState({ ...MARKET_STORE_DEFAULTS })
  const [storeSaving, setStoreSaving] = useState(false)

  useEffect(() => {
    fetch("/admin/marketplace/api?section=banners")
      .then((r) => r.json())
      .then((d) => {
        if (d?.banners) setBanners({ ...EMPTY_BANNERS, ...d.banners, departments: d.banners.departments || {} })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    fetch("/admin/marketplace/api?section=store")
      .then((r) => r.json())
      .then((d) => {
        if (d?.store) setStore({ ...MARKET_STORE_DEFAULTS, ...d.store })
      })
      .catch(() => {})
  }, [])

  const flash = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(""), 3500)
  }

  const setSlot = (id: string, url: string) =>
    setBanners((b) => ({ ...b, [id]: url } as MarketBanners))

  const setDept = (slug: string, url: string) =>
    setBanners((b) => {
      const departments = { ...b.departments }
      if (url.trim()) departments[slug] = url.trim()
      else delete departments[slug]
      return { ...b, departments }
    })

  const pickUpload = (target: string) => {
    setUploadTarget(target)
    fileRef.current?.click()
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !uploadTarget) return
    setUploading(uploadTarget)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Upload failed")
      const url = String(data?.url || data?.path || "")
      if (!url) throw new Error("Upload returned no URL")
      if (uploadTarget.startsWith("dept:")) setDept(uploadTarget.slice(5), url)
      else setSlot(uploadTarget, url)
      flash("Image uploaded — hit Save banners to go live")
    } catch (err) {
      flash(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(null)
      setUploadTarget(null)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "banners-save", banners }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Save failed")
      flash("Banners saved — live on the storefront instantly")
    } catch (err) {
      flash(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const saveStore = async () => {
    setStoreSaving(true)
    try {
      const res = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "store-save", store }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Save failed")
      if (data?.store) setStore({ ...MARKET_STORE_DEFAULTS, ...data.store })
      flash("Store contact info saved — live in the footer instantly")
    } catch (err) {
      flash(err instanceof Error ? err.message : "Save failed")
    } finally {
      setStoreSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border rounded-xl p-10 text-center text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-600" /> Loading banners...
      </div>
    )
  }

  const slotValue = (id: string) => (banners as unknown as Record<string, string>)[id] || ""

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/avif" className="hidden" onChange={onFile} />

      {notice && (
        <div className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2 flex items-center gap-2">
          <BadgeCheck className="h-4 w-4" /> {notice}
        </div>
      )}

      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-bold text-slate-900">Black Friday promo surfaces</h2>
        <p className="text-sm text-slate-500 mt-1">
          One switch for every promo surface: the red top strip, the “Black Friday Specials” button,
          the homepage promo banner and the hero “Limited Black Friday Special” kicker. Turn it OFF and
          they all disappear from the public store instantly — no deploy. Turn it back ON anytime.
        </p>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3">
          <input
            type="checkbox"
            checked={banners.promo_enabled !== false}
            onChange={(e) => setBanners((b) => ({ ...b, promo_enabled: e.target.checked }))}
            className="h-5 w-5 accent-[#F59E0B]"
          />
          <span className="text-sm font-bold text-slate-900">
            {banners.promo_enabled !== false ? "Promo is ON — showing publicly" : "Promo is OFF — hidden publicly"}
          </span>
        </label>
      </div>

      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-bold text-slate-900">Store contact info</h2>
        <p className="text-sm text-slate-500 mt-1">
          The address, phone and email shown in the storefront footer. Save here and it reflects publicly right away.
        </p>
        <div className="grid gap-3 mt-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Coverage line</span>
            <input
              value={store.address}
              onChange={(e) => setStore((s) => ({ ...s, address: e.target.value }))}
              placeholder="Lagos • Nairobi • Accra — ships worldwide"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Phone</span>
              <input
                value={store.phone}
                onChange={(e) => setStore((s) => ({ ...s, phone: e.target.value }))}
                placeholder="+234 (0) 800 000 0000"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Email</span>
              <input
                value={store.email}
                onChange={(e) => setStore((s) => ({ ...s, email: e.target.value }))}
                placeholder="market@techpivo.com"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              />
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={saveStore}
          disabled={storeSaving}
          className="mt-4 inline-flex items-center gap-2 bg-[#0F172A] hover:bg-black text-white text-sm font-bold rounded-lg px-5 py-2.5 disabled:opacity-60"
        >
          {storeSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {storeSaving ? "Saving..." : "Save contact info"}
        </button>
      </div>

      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-bold text-slate-900">Storefront banners</h2>
        <p className="text-sm text-slate-500 mt-1">
          Upload your own banners or paste image URLs. Empty = built-in default. Page heroes
          (Shop, Deals, Best Sellers, New Arrivals, Top Stores, Track Order, homepage) show in{" "}
          <strong>FULL</strong> — never cropped, any ratio fits. Category / department banners render with{" "}
          <code>object-cover</code> under a text scrim.
        </p>

        <div className="grid gap-4 mt-4">
          {BANNER_SLOTS.map((slot) => {
            const val = slotValue(slot.id) || ""
            return (
              <div key={slot.id} className="border rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{slot.label}</p>
                    <p className="text-xs text-slate-500">
                      Recommended: <strong className="text-slate-700">{slot.dims}</strong> · {slot.hint}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => pickUpload(slot.id)}
                      disabled={uploading === slot.id}
                      className="inline-flex items-center gap-1.5 text-xs font-bold border rounded-lg px-3 py-2 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {uploading === slot.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                      {uploading === slot.id ? "Uploading..." : "Upload"}
                    </button>
                    {val && (
                      <button
                        type="button"
                        onClick={() => setSlot(slot.id, "")}
                        className="inline-flex items-center gap-1.5 text-xs font-medium border rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Default
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-3">
                  <input
                    value={val}
                    onChange={(e) => setSlot(slot.id, e.target.value)}
                    placeholder="https://... (or upload)"
                    className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 ${val && !isUrl(val) ? "border-red-300" : ""}`}
                  />
                </div>
                {val && !isUrl(val) && <p className="text-xs text-red-500 mt-1">That doesn&apos;t look like an image URL.</p>}
                {val && isUrl(val) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={val} alt={`${slot.label} preview`} className="mt-3 w-full max-h-44 object-cover rounded-lg border" loading="lazy" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-bold text-slate-900">Category page banners</h2>
        <p className="text-sm text-slate-500 mt-1">
          Per-department banner image. Recommended: <strong className="text-slate-700">{DEPT_BANNER_DIMS}</strong>.
          Empty = the “Category pages (default)” banner above, then the built-in photo.
        </p>
        <div className="grid gap-3 mt-4 sm:grid-cols-2">
          {MARKET_DEPARTMENTS.map((d) => {
            const val = banners.departments[d.slug] || ""
            const key = `dept:${d.slug}`
            return (
              <div key={d.slug} className="border rounded-xl p-3">
                <p className="text-sm font-bold text-slate-900">{d.name}</p>
                <p className="text-[11px] text-slate-400">{d.slug}</p>
                <div className="flex gap-2 mt-2">
                  <input
                    value={val}
                    onChange={(e) => setDept(d.slug, e.target.value)}
                    placeholder="https://... (empty = default)"
                    className="flex-1 min-w-0 border rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => pickUpload(key)}
                    disabled={uploading === key}
                    className="shrink-0 inline-flex items-center gap-1 text-xs font-bold border rounded-lg px-2.5 py-2 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {uploading === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                    {uploading === key ? "..." : "Upload"}
                  </button>
                </div>
                {val && isUrl(val) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={val} alt={`${d.name} banner preview`} className="mt-2 w-full h-20 object-cover rounded-lg border" loading="lazy" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-bold rounded-lg px-6 py-3 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save banners"}
        </button>
      </div>
    </div>
  )
}
