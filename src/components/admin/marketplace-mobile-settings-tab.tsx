"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ChevronDown, ChevronUp, ImagePlus, Link2, Loader2, MousePointerClick,
  Plus, RotateCcw, Save, Settings2, Trash2, X, Phone,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cleanBannerLink } from "@/lib/marketplace-banners"
import {
  marketBtnPrimaryCls,
  marketBtnDarkCls,
  marketBtnGhostCls,
  marketCardCls,
  marketInputCls,
  MarketBadge,
  MarketLoading,
  MarketPageBar,
  marketIconBtnCls,
} from "@/components/admin/marketplace-ui"
import { cn } from "@/lib/utils"
import {
  EMPTY_MOBILE_SETTINGS,
  MARKETPLACE_MOBILE_KEY,
  type MarketMobileSettings,
} from "@/lib/marketplace-mobile"

const inputCls =
  "w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
const miniBtn =
  "inline-flex shrink-0 items-center gap-1 rounded-lg border bg-white px-2.5 py-1.5 text-xs font-bold hover:bg-slate-100 disabled:opacity-60"

function isUrl(v: string): boolean {
  return /^https?:\/\/.+/i.test(v.trim()) || v.trim().startsWith("/")
}

/**
 * Admin tab: Mobile Settings — configurable mobile promo notice bar,
 * announcement strip, and subcategory image rotation.
 *
 * Reads/writes site_settings key "marketplace_mobile" via
 * POST /admin/marketplace/api (action "mobile-settings-save").
 */
export function MarketplaceMobileSettingsTab(): JSX.Element | null {
  const [settings, setSettings] = useState<MarketMobileSettings>(
    () => ({ ...EMPTY_MOBILE_SETTINGS })
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")
  const [section, setSection] = useState<string>("promo")
  const [openSection, setOpenSection] = useState<string>("promo")
  const [uploading, setUploading] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadTarget, setUploadTarget] = useState<string | null>(null)

  const configForList = (): MarketMobileSettings => settings

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const res = await fetch(
          `/admin/marketplace/api?section=mobile-settings`
        )
        const data = await res.json().catch(() => null)
        if (!alive) return
        if (data?.settings) {
          setSettings({
            ...EMPTY_MOBILE_SETTINGS,
            ...data.settings,
          })
        }
      } catch {
        // keep empty defaults
      } finally {
        setLoading(false)
      }
    }
    load()
    const poll = setInterval(load, 60000)
    let channel:
      | ReturnType<ReturnType<typeof createClient>["channel"]>
      | null = null
    try {
      const supabase = createClient()
      channel = supabase
        .channel(`admin_mobile_settings_${Date.now()}_${Math.random()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => load())
        .subscribe()
    } catch {
      // realtime unavailable — polling still covers it
    }
    return () => {
      alive = false
      clearInterval(poll)
      if (channel) {
        try {
          const supabase = createClient()
          supabase.removeChannel(channel)
        } catch {
          // ignore
        }
      }
    }
  }, [])

  const flash = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(""), 3500)
  }

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
      if (uploadTarget === "promo_logo") {
        setSettings((s) => ({ ...s, promo_notice: { ...s.promo_notice, logo: url } }))
      }
      flash("Image uploaded — hit Save settings to go live")
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
        body: JSON.stringify({ action: "mobile-settings-save", settings: configForList() }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Save failed")
      if (data?.settings) {
        setSettings({
          ...EMPTY_MOBILE_SETTINGS,
          ...data.settings,
        })
      }
      flash("Mobile settings saved — live on the storefront instantly")
    } catch (err) {
      flash(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const setField = <K extends keyof MarketMobileSettings>(
    key: K,
    value: MarketMobileSettings[K]
  ) => {
    setSettings((s) => ({ ...s, [key]: value }))
  }

  const setNested = (
    sectionKey: "promo_notice" | "announcement",
    patch: Partial<MarketMobileSettings["promo_notice"]> | Partial<MarketMobileSettings["announcement"]>
  ) => {
    setSettings((s) => ({
      ...s,
      [sectionKey]: { ...s[sectionKey], ...patch } as MarketMobileSettings["promo_notice"],
    }))
  }

  if (loading) return <MarketLoading label="Loading mobile settings..." />

  const noticeConf = settings.promo_notice
  const announceConf = settings.announcement

  return (
    <div className="w-full space-y-3">
      {/* Keeps the mobile settings in sync across admin tabs */}
      <MarketPageBar
        icon={Phone}
        title="Mobile Settings"
        desc="Mobile promo notice bar, announcement strip & category nav — saved to site_settings and live instantly"
        badge={
          <MarketBadge tone="emerald" dot pulse>
            Mobile Settings
          </MarketBadge>
        }
        actions={
          <>
            <button
              className={marketBtnPrimaryCls}
              onClick={save}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </>
        }
      />
      {notice && (
        <div className="mb-3 flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          <X className="h-3.5 w-3.5 shrink-0" /> {notice}
        </div>
      )}

      {/* 1 — Promo notice bar */}
      <Section
        step="1"
        title="Mobile Promotional Notice Bar"
        desc="Top-of-screen promo banner on the mobile marketplace — TechPivo logo, heading, CTA and close button. Controlled entirely from here."
        open={openSection === "promo"}
        onToggle={() => setOpenSection(openSection === "promo" ? "" : "promo")}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <p className="text-sm font-bold text-slate-900">Enable notice bar</p>
            <p className="text-xs text-slate-500">When ON, the notice bar shows at the top of the mobile marketplace.</p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              checked={noticeConf.enabled !== false}
              onChange={(e) => setNested("promo_notice", { enabled: e.target.checked })}
              className="h-4 w-4 accent-[#F59E0B]"
            />
            Show
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Main heading</label>
            <input
              value={noticeConf.heading}
              onChange={(e) => setNested("promo_notice", { heading: e.target.value })}
              placeholder="Welcome to TechPivo Market"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Supporting text</label>
            <input
              value={noticeConf.description}
              onChange={(e) => setNested("promo_notice", { description: e.target.value })}
              placeholder="Discover amazing deals across all categories."
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Button label</label>
            <input
              value={noticeConf.button_label}
              onChange={(e) => setNested("promo_notice", { button_label: e.target.value })}
              placeholder="Shop Now"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Button URL</label>
            <div className="flex gap-2">
              <input
                value={noticeConf.button_url}
                onChange={(e) => setNested("promo_notice", { button_url: cleanBannerLink(e.target.value) })}
                placeholder="/marketplace/deals or https://…"
                className={`${inputCls} min-w-0 flex-1 text-xs ${noticeConf.button_url && !isUrl(noticeConf.button_url) ? "border-red-300" : ""}`}
              />
              <button type="button" onClick={() => pickUpload("promo_logo")} disabled={uploading === "promo_logo"} className={miniBtn}>
                {uploading === "promo_logo" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                {uploading === "promo_logo" ? "…" : "Upload"}
              </button>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Logo image</label>
            <div className="flex gap-2">
              <input
                value={noticeConf.logo || ""}
                onChange={(e) => setNested("promo_notice", { logo: e.target.value })}
                placeholder="TechPivo logo image URL"
                className={`${inputCls} min-w-0 flex-1 text-xs ${noticeConf.logo && !isUrl(noticeConf.logo) ? "border-red-300" : ""}`}
              />
              {(noticeConf.logo || "").trim() && isUrl(noticeConf.logo || "") && (
                <img src={noticeConf.logo.trim()} alt="Logo preview" className="mt-2 h-12 w-auto rounded object-contain" loading="lazy" />
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Square logo works best. Upload via the button above.</p>
          </div>
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(noticeConf.bg_color || "") ? noticeConf.bg_color : "#0F172A"}
              onChange={(e) => setNested("promo_notice", { bg_color: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border"
              aria-label="Background colour"
            />
            Background colour
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(noticeConf.text_color || "") ? noticeConf.text_color : "#ffffff"}
              onChange={(e) => setNested("promo_notice", { text_color: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border"
              aria-label="Text colour"
            />
            Text colour
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(noticeConf.btn_bg_color || "") ? noticeConf.btn_bg_color : "#FF6B00"}
              onChange={(e) => setNested("promo_notice", { btn_bg_color: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border"
              aria-label="Button colour"
            />
            Button background
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(noticeConf.btn_text_color || "") ? noticeConf.btn_text_color : "#ffffff"}
              onChange={(e) => setNested("promo_notice", { btn_text_color: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border"
              aria-label="Button text colour"
            />
            Button text
          </div>
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Starts (optional)</span>
            <input
              type="datetime-local"
              value={noticeConf.start_at ? new Date(noticeConf.start_at).toISOString().slice(0, 16) : ""}
              onChange={(e) => setNested("promo_notice", { start_at: e.target.value ? new Date(e.target.value).toISOString() : "" })}
              className={inputCls}
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ends (optional)</span>
            <input
              type="datetime-local"
              value={noticeConf.end_at ? new Date(noticeConf.end_at).toISOString().slice(0, 16) : ""}
              onChange={(e) => setNested("promo_notice", { end_at: e.target.value ? new Date(e.target.value).toISOString() : "" })}
              className={inputCls}
            />
          </div>
        </div>
      </Section>

      {/* 2 — Announcement strip */}
      <Section
        step="2"
        title="Announcement Strip"
        desc="Slim strip beneath the mobile header — short announcement with optional CTA. Hidden when disabled."
        open={openSection === "announce"}
        onToggle={() => setOpenSection(openSection === "announce" ? "" : "announce")}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <p className="text-sm font-bold text-slate-900">Enable announcement strip</p>
            <p className="text-xs text-slate-500">Shows a slim coloured strip below the header on mobile.</p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              checked={announceConf.enabled !== false}
              onChange={(e) => setNested("announcement", { enabled: e.target.checked })}
              className="h-4 w-4 accent-[#F59E0B]"
            />
            Show
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Announcement text</label>
            <input
              value={announceConf.text}
              onChange={(e) => setNested("announcement", { text: e.target.value })}
              placeholder="✓ Free Shipping on Selected Orders"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Action text</label>
            <input
              value={announceConf.action_text}
              onChange={(e) => setNested("announcement", { action_text: e.target.value })}
              placeholder="Limited-Time Offers →"
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Action URL</label>
            <input
              value={announceConf.action_url}
              onChange={(e) => setNested("announcement", { action_url: cleanBannerLink(e.target.value) })}
              placeholder="/marketplace/deals or https://…"
              className={`${inputCls} min-w-0 flex-1 text-xs ${announceConf.action_url && !isUrl(announceConf.action_url) ? "border-red-300" : ""}`}
            />
          </div>
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(announceConf.bg_color || "") ? announceConf.bg_color : "#FF6B00"}
              onChange={(e) => setNested("announcement", { bg_color: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border"
              aria-label="Strip background colour"
            />
            Strip background
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(announceConf.text_color || "") ? announceConf.text_color : "#ffffff"}
              onChange={(e) => setNested("announcement", { text_color: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border"
              aria-label="Strip text colour"
            />
            Strip text
          </div>
        </div>
      </Section>

      {/* 3 — Subcategory image rotation */}
      <Section
        step="3"
        title="Category Image Rotation"
        desc="Subcategory cards on the mobile category page rotate their product images automatically. Default 10 seconds."
        open={openSection === "rotation"}
        onToggle={() => setOpenSection(openSection === "rotation" ? "" : "rotation")}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <p className="text-sm font-bold text-slate-900">Rotation interval</p>
            <p className="text-xs text-slate-500">How often subcategory card images change on the mobile category page.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Interval (seconds)</label>
            <input
              type="number"
              min={1}
              max={300}
              value={String(Math.round(settings.subcategory_rotation_ms / 1000))}
              onChange={(e) => {
                const n = Number(e.target.value)
                setField(
                  "subcategory_rotation_ms",
                  Number.isFinite(n) ? Math.min(300, Math.max(1, Math.round(n))) * 1000 : 10_000
                )
              }}
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-slate-500">Default 10 seconds. Pause when the category page is hidden to save mobile resources.</p>
          </div>
        </div>
      </Section>
    </div>
  )
}

function Section({
  step,
  title,
  desc,
  open,
  onToggle,
  children,
}: {
  step: string
  title: string
  desc: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className={cn(marketCardCls, "overflow-hidden")}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50/60 sm:px-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-extrabold text-[#F59E0B]">
          {step}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-extrabold text-slate-900 sm:text-[15px]">{title}</span>
          <span className="mt-0.5 block truncate text-xs text-slate-500">{desc}</span>
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      {open && <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-3 sm:p-4">{children}</div>}
    </div>
  )
}
