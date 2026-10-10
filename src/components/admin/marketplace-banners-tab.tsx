"use client"

import { useEffect, useRef, useState } from "react"
import { BadgeCheck, ChevronDown, ChevronUp, ImagePlus, Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react"
import { MARKET_DEPARTMENTS } from "@/lib/marketplace-categories"
import {
  BANNER_SLOTS,
  BANNER_TRANSITIONS,
  BANNER_TRANSITION_GROUPS,
  DEPT_BANNER_DIMS,
  EMPTY_BANNERS,
  SLIDER_EASINGS,
  easingCss,
  type BannerTransition,
  type MarketBanners,
  type SliderEasing,
} from "@/lib/marketplace-banners"
import { BannerSlider } from "@/components/marketplace/banner-slider"

// Two built-in artworks so the transition preview plays even before any
// upload (real uploads preview with your own images once added).
function sampleSlide(bg1: string, bg2: string, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="320"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs><rect width="800" height="320" fill="url(#g)"/><text x="400" y="175" font-family="Arial" font-size="52" font-weight="bold" fill="#ffffff" text-anchor="middle">${label}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
const PREVIEW_SLIDES = [
  sampleSlide("#DC2626", "#7F1D1D", "Mega Deal"),
  sampleSlide("#F59E0B", "#EA580C", "New Drop"),
  sampleSlide("#0F172A", "#1E3A8A", "TechPivo"),
]
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

  // Extra slider images per slot (cover field above = slide 1).
  const [extraUrl, setExtraUrl] = useState<Record<string, string>>({})
  const slidesOf = (key: string): string[] => {
    const v = (banners as unknown as Record<string, unknown>)[key]
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
  }
  const setSlides = (key: string, list: string[]) =>
    setBanners((b) => ({ ...b, [key]: list } as MarketBanners))
  const moveSlide = (key: string, i: number, dir: -1 | 1) => {
    const list = slidesOf(key)
    const j = i + dir
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    setSlides(key, next)
  }
  const removeSlide = (key: string, i: number) =>
    setSlides(key, slidesOf(key).filter((_, x) => x !== i))
  const addSlideUrl = (key: string) => {
    const url = (extraUrl[key] || "").trim()
    if (!url) return
    setSlides(key, [...slidesOf(key), url])
    setExtraUrl((m) => ({ ...m, [key]: "" }))
  }

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
      else if (uploadTarget.startsWith("slides:")) {
        const [, key, pos] = uploadTarget.split(":")
        const list = [...slidesOf(key)]
        if (pos === "new") list.push(url)
        else list[Number(pos)] = url
        setSlides(key, list.slice(0, 10))
      }
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
        <h2 className="font-bold text-slate-900">Banner slider — transitions & animation</h2>
        <p className="text-sm text-slate-500 mt-1">
          One setting drives <strong>every</strong> banner slider on the storefront (homepage hero, both
          side promos, promo strip). A slot with a single image stays static; upload 2 or more and it
          slides with the transition you pick here — live on the site the moment you hit{" "}
          <strong>Save banners</strong>.
        </p>
        <div className="grid gap-3 mt-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Transition style</span>
            <select
              value={banners.slider_transition}
              onChange={(e) =>
                setBanners((b) => ({ ...b, slider_transition: e.target.value as BannerTransition }))
              }
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
            >
              {BANNER_TRANSITION_GROUPS.map((g) => (
                <optgroup key={g.id} label={g.label}>
                  {BANNER_TRANSITIONS.filter((t) => t.group === g.id).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} — {t.hint}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Easing curve</span>
            <select
              value={banners.slider_easing}
              onChange={(e) =>
                setBanners((b) => ({ ...b, slider_easing: e.target.value as SliderEasing }))
              }
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
            >
              {SLIDER_EASINGS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Transition duration — {banners.slider_duration} ms
            </span>
            <input
              type="range"
              min={300}
              max={3000}
              step={50}
              value={banners.slider_duration}
              onChange={(e) => setBanners((b) => ({ ...b, slider_duration: Number(e.target.value) }))}
              className="mt-2 w-full accent-[#F59E0B]"
            />
            <span className="text-[11px] text-slate-400">300 ms (snappy) → 3000 ms (cinematic)</span>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Auto-slide every (seconds)
            </span>
            <input
              type="number"
              min={2}
              max={30}
              value={banners.slider_interval}
              onChange={(e) => {
                const n = Number(e.target.value)
                setBanners((b) => ({
                  ...b,
                  slider_interval: Number.isFinite(n) ? Math.min(30, Math.max(2, Math.round(n))) : 5,
                }))
              }}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-5 mt-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={banners.slider_autoplay !== false}
              onChange={(e) => setBanners((b) => ({ ...b, slider_autoplay: e.target.checked }))}
              className="h-4 w-4 accent-[#F59E0B]"
            />
            Autoplay
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={banners.slider_arrows !== false}
              onChange={(e) => setBanners((b) => ({ ...b, slider_arrows: e.target.checked }))}
              className="h-4 w-4 accent-[#F59E0B]"
            />
            Show ‹ › arrows
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={banners.slider_dots !== false}
              onChange={(e) => setBanners((b) => ({ ...b, slider_dots: e.target.checked }))}
              className="h-4 w-4 accent-[#F59E0B]"
            />
            Show dot indicators
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={banners.slider_progress !== false}
              onChange={(e) => setBanners((b) => ({ ...b, slider_progress: e.target.checked }))}
              className="h-4 w-4 accent-[#F59E0B]"
            />
            Show progress bar
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={banners.slider_thumbs === true}
              onChange={(e) => setBanners((b) => ({ ...b, slider_thumbs: e.target.checked }))}
              className="h-4 w-4 accent-[#F59E0B]"
            />
            Show thumbnails
          </label>
        </div>
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Live preview — plays exactly as the storefront will
          </p>
          <div className="relative aspect-[16/5] overflow-hidden rounded-xl border bg-slate-900">
            <BannerSlider
              slides={PREVIEW_SLIDES}
              alt="Transition preview"
              transition={banners.slider_transition}
              durationMs={banners.slider_duration}
              easingCss={easingCss(banners.slider_easing)}
              autoplay={banners.slider_autoplay !== false}
              intervalSec={banners.slider_interval}
              showArrows={banners.slider_arrows !== false}
              showDots={banners.slider_dots !== false}
              showProgress={banners.slider_progress !== false}
              showThumbs={banners.slider_thumbs === true}
            />
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-bold text-slate-900">Store contact info</h2>
        <p className="text-sm text-slate-500 mt-1">
          The address, phone and email shown in the storefront footer. Save here and it reflects publicly right away.
        </p>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3">
          <input
            type="checkbox"
            checked={store.contact_visible !== false}
            onChange={(e) => setStore((s) => ({ ...s, contact_visible: e.target.checked }))}
            className="h-5 w-5 accent-[#F59E0B]"
          />
          <span className="text-sm font-bold text-slate-900">
            {store.contact_visible !== false ? "Contact block is ON — showing publicly" : "Contact block is OFF — hidden publicly"}
          </span>
        </label>
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
          Upload your own banners or paste image URLs. Empty = built-in default. The homepage
          hero (left 2/3) and both side promos (right 1/3) render{" "}
          <strong>FILL</strong> — edge to edge with <code>object-cover</code> (upload the exact
          recommended size to avoid cropping). Upload <strong>more than one image</strong> in any of
          the first four slots and that space becomes a slider, playing with the transition style,
          speed, arrows and dots picked in the card above. Shop, Deals, Best Sellers, New Arrivals,
          Top Stores and Track Order page heroes show in <strong>FULL</strong> — never cropped, any
          ratio fits. Category / department banners render with <code>object-cover</code> under a
          text scrim.
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
                {"slidesKey" in slot && (
                  <div className="mt-3 rounded-lg border bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-700">
                      Slider images — {(() => {
                        const n = slidesOf(slot.slidesKey).length + (val.trim() ? 1 : 0)
                        return n === 0 ? "none yet (default design shows)" : `${n} total (cover above = slide 1)`
                      })()}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Add more images to slide in this exact space. Plays with the transition picked above.
                    </p>
                    {slidesOf(slot.slidesKey).map((s, i) => (
                      <div key={`${i}-${s}`} className="mt-2 flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s} alt="" className="h-10 w-16 shrink-0 rounded border object-cover" loading="lazy" />
                        <input
                          value={s}
                          onChange={(e) => {
                            const next = [...slidesOf(slot.slidesKey)]
                            next[i] = e.target.value
                            setSlides(slot.slidesKey, next)
                          }}
                          placeholder="https://..."
                          className="min-w-0 flex-1 border rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          title="Move up"
                          onClick={() => moveSlide(slot.slidesKey, i, -1)}
                          disabled={i === 0}
                          className="rounded-md border bg-white p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Move down"
                          onClick={() => moveSlide(slot.slidesKey, i, 1)}
                          disabled={i === slidesOf(slot.slidesKey).length - 1}
                          className="rounded-md border bg-white p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Remove slide"
                          onClick={() => removeSlide(slot.slidesKey, i)}
                          className="rounded-md border bg-white p-1.5 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        value={extraUrl[slot.slidesKey] || ""}
                        onChange={(e) => setExtraUrl((m) => ({ ...m, [slot.slidesKey]: e.target.value }))}
                        placeholder="Paste image URL, then Add"
                        className="min-w-0 flex-1 border rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => addSlideUrl(slot.slidesKey)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border bg-white px-2.5 py-1.5 text-xs font-bold hover:bg-slate-100"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add
                      </button>
                      <button
                        type="button"
                        onClick={() => pickUpload(`slides:${slot.slidesKey}:new`)}
                        disabled={uploading === `slides:${slot.slidesKey}:new`}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border bg-white px-2.5 py-1.5 text-xs font-bold hover:bg-slate-100 disabled:opacity-60"
                      >
                        {uploading === `slides:${slot.slidesKey}:new` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                        Upload
                      </button>
                    </div>
                  </div>
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
