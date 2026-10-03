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

  useEffect(() => {
    fetch("/admin/marketplace/api?section=banners")
      .then((r) => r.json())
      .then((d) => {
        if (d?.banners) setBanners({ ...EMPTY_BANNERS, ...d.banners, departments: d.banners.departments || {} })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
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
        <h2 className="font-bold text-slate-900">Storefront banners</h2>
        <p className="text-sm text-slate-500 mt-1">
          Upload your own banners or paste image URLs. Empty = built-in default. All banners render with{" "}
          <code>object-cover</code> so any ratio fits without stretching — but matching the recommended dimensions
          below gives the sharpest result.
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
