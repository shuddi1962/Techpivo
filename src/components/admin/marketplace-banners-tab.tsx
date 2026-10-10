"use client"

import { useEffect, useRef, useState } from "react"
import {
  BadgeCheck, ChevronDown, ChevronUp, ImagePlus, Layers, Link2,
  Loader2, MousePointerClick, Plus, RotateCcw, Save, Settings2, Trash2,
} from "lucide-react"
import { MARKET_DEPARTMENTS } from "@/lib/marketplace-categories"
import {
  BANNER_LINK_PRESETS,
  BANNER_SLOTS,
  BANNER_TRANSITIONS,
  BANNER_TRANSITION_GROUPS,
  DEPT_BANNER_DIMS,
  DEFAULT_SLOT_SLIDER,
  EMPTY_BANNERS,
  SLIDER_EASINGS,
  bannerLinkLabel,
  cleanBannerLink,
  easingCss,
  slotSliderOf,
  type BannerSlide,
  type BannerTransition,
  type MarketBanners,
  type SliderEasing,
  type SliderSlotKey,
  type SlotSlider,
} from "@/lib/marketplace-banners"
import { BannerSlider } from "@/components/marketplace/banner-slider"
import { MARKET_STORE_DEFAULTS } from "@/lib/marketplace-store"

// Sample artworks so a transition preview plays even before any upload.
function sampleSlide(bg1: string, bg2: string, label: string): BannerSlide {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="320"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs><rect width="800" height="320" fill="url(#g)"/><text x="400" y="175" font-family="Arial" font-size="52" font-weight="bold" fill="#ffffff" text-anchor="middle">${label}</text></svg>`
  return { image: `data:image/svg+xml,${encodeURIComponent(svg)}`, link: "" }
}
const PREVIEW_SLIDES: BannerSlide[] = [
  sampleSlide("#DC2626", "#7F1D1D", "Mega Deal"),
  sampleSlide("#F59E0B", "#EA580C", "New Drop"),
  sampleSlide("#0F172A", "#1E3A8A", "TechPivo"),
]

// Every place a banner can point to: store pages first, then every live
// department / subcategory. Anything else can be typed as a custom URL.
const LINK_OPTIONS: Array<{ value: string; label: string }> = [
  ...BANNER_LINK_PRESETS,
  ...MARKET_DEPARTMENTS.flatMap((d) => [
    { value: `/marketplace/category/${d.slug}`, label: `Department — ${d.name}` },
    ...d.subs.map((s) => ({ value: `/marketplace/category/${s.slug}`, label: `${d.name} — ${s.name}` })),
  ]),
]

function isUrl(v: string): boolean {
  return /^https?:\/\/.+/i.test(v.trim()) || v.trim().startsWith("/")
}

const inputCls =
  "w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
const miniBtn =
  "inline-flex shrink-0 items-center gap-1 rounded-lg border bg-white px-2.5 py-1.5 text-xs font-bold hover:bg-slate-100 disabled:opacity-60"

// ---------------------------------------------------------------------------
// Destination picker: preset dropdown (+ departments) with a custom-URL
// escape hatch. One line when collapsed, never overwhelming.
// ---------------------------------------------------------------------------
function LinkField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [custom, setCustom] = useState("")
  const isPreset = LINK_OPTIONS.some((o) => o.value === value)
  const selectValue = value === "" || isPreset ? value : "__custom"
  return (
    <div>
      <div className="flex items-center gap-2">
        <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <select
          value={selectValue}
          onChange={(e) => {
            const v = e.target.value
            if (v === "__custom") {
              setCustom(value.startsWith("http") || value.startsWith("/") ? value : "")
            } else {
              onChange(v)
            }
          }}
          className={`${inputCls} text-xs`}
          aria-label="Where this banner opens"
        >
          {LINK_OPTIONS.map((o) => (
            <option key={o.label} value={o.value}>
              {o.label}
            </option>
          ))}
          <option value="__custom">Custom URL…</option>
        </select>
      </div>
      {selectValue === "__custom" && (
        <input
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value)
            onChange(cleanBannerLink(e.target.value))
          }}
          placeholder="https://… or /marketplace/…"
          className={`${inputCls} mt-2 text-xs`}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Per-slot animation studio: transition, easing, speed, autoplay and
// chrome — with a live preview playing exactly as the storefront will.
// ---------------------------------------------------------------------------
function SliderPanel({
  settings,
  onChange,
  previewSlides,
  open,
  onToggle,
}: {
  settings: SlotSlider
  onChange: (patch: Partial<SlotSlider>) => void
  previewSlides: BannerSlide[]
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/50">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Settings2 className="h-3.5 w-3.5 text-amber-600" />
          Animation — {BANNER_TRANSITIONS.find((t) => t.id === settings.transition)?.label || "Fade"}
          <span className="font-medium text-slate-500">
            · {settings.duration} ms{settings.autoplay ? ` · every ${settings.interval}s` : " · manual swipe"}
          </span>
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {open && (
        <div className="space-y-3 border-t border-amber-200/70 px-3 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Transition</span>
              <select
                value={settings.transition}
                onChange={(e) => onChange({ transition: e.target.value as BannerTransition })}
                className={`${inputCls} mt-1 text-xs`}
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
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Motion feel</span>
              <select
                value={settings.easing}
                onChange={(e) => onChange({ easing: e.target.value as SliderEasing })}
                className={`${inputCls} mt-1 text-xs`}
              >
                {SLIDER_EASINGS.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Speed — {settings.duration} ms
              </span>
              <input
                type="range"
                min={300}
                max={3000}
                step={50}
                value={settings.duration}
                onChange={(e) => onChange({ duration: Number(e.target.value) })}
                className="mt-2 w-full accent-[#F59E0B]"
              />
              <span className="text-[11px] text-slate-400">300 snappy → 3000 cinematic</span>
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                New banner every (seconds)
              </span>
              <input
                type="number"
                min={2}
                max={30}
                value={settings.interval}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  onChange({ interval: Number.isFinite(n) ? Math.min(30, Math.max(2, Math.round(n))) : 5 })
                }}
                className={`${inputCls} mt-1 text-xs`}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {(
              [
                ["autoplay", "Auto-slide"],
                ["arrows", "‹ › arrows"],
                ["dots", "Dots"],
                ["progress", "Progress bar"],
                ["thumbs", "Thumbnails"],
              ] as Array<[keyof SlotSlider, string]>
            ).map(([key, label]) => (
              <label key={key} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={!!settings[key]}
                  onChange={(e) => onChange({ [key]: e.target.checked } as Partial<SlotSlider>)}
                  className="h-3.5 w-3.5 accent-[#F59E0B]"
                />
                {label}
              </label>
            ))}
          </div>
          {!settings.autoplay && (
            <p className="text-[11px] text-slate-500">
              Auto-slide is off — shoppers swipe or tap through the banners manually (arrows/dots stay if enabled).
            </p>
          )}
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Preview — plays exactly as the storefront will
            </p>
            <div className="relative aspect-[16/5] overflow-hidden rounded-lg border bg-slate-900">
              <BannerSlider
                slides={previewSlides.length > 0 ? previewSlides : PREVIEW_SLIDES}
                alt="Transition preview"
                transition={settings.transition}
                durationMs={settings.duration}
                easingCss={easingCss(settings.easing)}
                autoplay={settings.autoplay}
                intervalSec={settings.interval}
                showArrows={settings.arrows}
                showDots={settings.dots}
                showProgress={settings.progress}
                showThumbs={settings.thumbs}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Extra slider images for one slot, each with its own destination link.
// ---------------------------------------------------------------------------
function SlideExtras({
  slides,
  onChange,
}: {
  slides: BannerSlide[]
  onChange: (next: BannerSlide[]) => void
}) {
  const [extraUrl, setExtraUrl] = useState("")
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= slides.length) return
    const next = [...slides]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  return (
    <div className="mt-3 rounded-xl bg-slate-50 p-3">
      <p className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
        <Layers className="h-3.5 w-3.5 text-slate-400" />
        {slides.length === 0
          ? "More banners — add several to slide here"
          : `${slides.length} more banner${slides.length === 1 ? "" : "s"} (slide 2, 3, …)`}
      </p>
      {slides.map((s, i) => (
        <div key={`${i}-${s.image}`} className="mt-2 rounded-lg border bg-white p-2">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.image} alt="" className="h-10 w-16 shrink-0 rounded border object-cover" loading="lazy" />
            <input
              value={s.image}
              onChange={(e) => {
                const next = [...slides]
                next[i] = { ...next[i], image: e.target.value }
                onChange(next)
              }}
              placeholder="https://..."
              className={`${inputCls} min-w-0 flex-1 text-xs`}
            />
            <button type="button" title="Move up" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-md border bg-white p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" title="Move down" onClick={() => move(i, 1)} disabled={i === slides.length - 1} className="rounded-md border bg-white p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button type="button" title="Remove" onClick={() => onChange(slides.filter((_, x) => x !== i))} className="rounded-md border bg-white p-1.5 text-red-500 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2">
            <LinkField
              value={s.link}
              onChange={(v) => {
                const next = [...slides]
                next[i] = { ...next[i], link: v }
                onChange(next)
              }}
            />
          </div>
        </div>
      ))}
      <div className="mt-2 flex items-center gap-2">
        <input
          value={extraUrl}
          onChange={(e) => setExtraUrl(e.target.value)}
          placeholder="Paste image URL, then Add"
          className={`${inputCls} min-w-0 flex-1 text-xs`}
        />
        <button
          type="button"
          onClick={() => {
            const url = extraUrl.trim()
            if (!url || slides.length >= 10) return
            onChange([...slides, { image: url, link: "" }])
            setExtraUrl("")
          }}
          className={miniBtn}
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// One banner slot: cover image + where it opens, extra sliding banners,
// and (for slider slots) its own animation studio.
// ---------------------------------------------------------------------------
function SlotCard({
  slot,
  cover,
  coverLink,
  extras,
  slider,
  sliderOpen,
  open,
  uploading,
  onToggle,
  onSliderToggle,
  onCover,
  onCoverLink,
  onExtras,
  onSlider,
  onUploadCover,
  onReset,
}: {
  slot: (typeof BANNER_SLOTS)[number]
  cover: string
  coverLink: string
  extras: BannerSlide[]
  slider: SlotSlider
  sliderOpen: boolean
  open: boolean
  uploading: boolean
  onToggle: () => void
  onSliderToggle: () => void
  onCover: (v: string) => void
  onCoverLink: (v: string) => void
  onExtras: (v: BannerSlide[]) => void
  onSlider: (patch: Partial<SlotSlider>) => void
  onUploadCover: () => void
  onReset: () => void
}) {
  const total = (cover.trim() ? 1 : 0) + extras.length
  const isSlider = "slider" in slot && slot.slider && "slidesKey" in slot
  return (
    <div className={`overflow-hidden rounded-xl border bg-white transition-colors ${open ? "border-amber-300 shadow-sm" : ""}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 p-3 text-left">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${total > 0 ? "bg-emerald-500" : "bg-slate-300"}`} title={total > 0 ? "Custom banner live" : "Using default design"} />
        {cover && isUrl(cover) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-10 w-16 shrink-0 rounded-md border object-cover" loading="lazy" />
        ) : (
          <span className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md border bg-slate-50 text-[10px] font-bold text-slate-400">
            DEFAULT
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-slate-900">{slot.label}</span>
          <span className="block truncate text-[11px] text-slate-500">
            {total === 0
              ? "Default design shows"
              : `${total} banner${total === 1 ? "" : "s"}${isSlider && total > 1 ? ` · ${BANNER_TRANSITIONS.find((t) => t.id === slider.transition)?.label}` : ""}`}
            {coverLink ? ` · opens ${bannerLinkLabel(coverLink)}` : ""}
          </span>
        </span>
        <span className="hidden shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 sm:block">
          {slot.dims}
        </span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
      </button>
      {open && (
        <div className="space-y-3 border-t px-3 py-3">
          <p className="text-[11px] leading-relaxed text-slate-500">{slot.hint}</p>
          <div className="flex items-center gap-2">
            <input
              value={cover}
              onChange={(e) => onCover(e.target.value)}
              placeholder="https://… — banner 1 (empty = default)"
              className={`${inputCls} min-w-0 flex-1 text-xs ${cover && !isUrl(cover) ? "border-red-300" : ""}`}
            />
            <button type="button" onClick={onUploadCover} disabled={uploading} className={miniBtn}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
              {uploading ? "…" : "Upload"}
            </button>
            {cover && (
              <button type="button" onClick={onReset} title="Back to default" className="rounded-lg border p-2 text-slate-400 hover:bg-slate-50">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {cover && !isUrl(cover) && <p className="text-xs text-red-500">That doesn&apos;t look like an image URL.</p>}
          {cover && isUrl(cover) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={`${slot.label} preview`} className="w-full max-h-44 rounded-lg border object-cover" loading="lazy" />
          )}
          <div>
            <p className="mb-1.5 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <MousePointerClick className="h-3 w-3" /> Where banner 1 opens
            </p>
            <LinkField value={coverLink} onChange={onCoverLink} />
          </div>
          {isSlider && "slidesKey" in slot && (
            <>
              <SlideExtras slides={extras} onChange={onExtras} />
              <SliderPanel
                settings={slider}
                onChange={onSlider}
                previewSlides={[{ image: cover, link: coverLink }, ...extras].filter((s) => s.image.trim())}
                open={sliderOpen}
                onToggle={onSliderToggle}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single-image banner row (page + department banners): image + link only.
// ---------------------------------------------------------------------------
function SingleBannerRow({
  label,
  sub,
  value,
  link,
  uploading,
  onValue,
  onLink,
  onUpload,
  onReset,
}: {
  label: string
  sub: string
  value: string
  link: string
  uploading: boolean
  onValue: (v: string) => void
  onLink: (v: string) => void
  onUpload: () => void
  onReset?: () => void
}) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="flex items-center gap-2.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${value.trim() ? "bg-emerald-500" : "bg-slate-300"}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">{label}</p>
          <p className="truncate text-[11px] text-slate-400">
            {sub}{link ? ` · opens ${bannerLinkLabel(link)}` : ""}
          </p>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={value}
          onChange={(e) => onValue(e.target.value)}
          placeholder="https://… (empty = default)"
          className={`${inputCls} min-w-0 flex-1 text-xs`}
        />
        <button type="button" onClick={onUpload} disabled={uploading} className={miniBtn}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          {uploading ? "…" : "Upload"}
        </button>
        {onReset && value.trim() && (
          <button type="button" onClick={onReset} title="Back to default" className="rounded-lg border p-2 text-slate-400 hover:bg-slate-50">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {value.trim() && (
        <div className="mt-2">
          {isUrl(value) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={`${label} preview`} className="h-20 w-full rounded-lg border object-cover" loading="lazy" />
          ) : null}
          <div className="mt-2">
            <LinkField value={link} onChange={onLink} />
          </div>
        </div>
      )}
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
    <div className="overflow-hidden rounded-xl border bg-white">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left sm:p-5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0F172A] text-xs font-extrabold text-white">
          {step}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-slate-900 sm:text-[15px]">{title}</span>
          <span className="block truncate text-xs text-slate-500">{desc}</span>
        </span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
      </button>
      {open && <div className="space-y-3 border-t bg-slate-50/60 p-3 sm:p-4">{children}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main tab
// ---------------------------------------------------------------------------
const HOME_SLOT_IDS = ["hero_image", "promo_image", "promo_deals_image", "promo_new_image", "strip1_image", "strip2_image"]
const PAGE_SLOT_IDS = ["category_default", "shop_image", "deals_image", "best_sellers_image", "new_arrivals_image", "top_stores_image", "track_image"]

function slidesKeyOf(slotId: string): SliderSlotKey | null {
  const slot = BANNER_SLOTS.find((s) => s.id === slotId)
  return slot && "slidesKey" in slot ? (slot.slidesKey as SliderSlotKey) : null
}

export function MarketplaceBannersTab() {
  const [banners, setBanners] = useState<MarketBanners>({ ...EMPTY_BANNERS, departments: {}, links: {}, slot_settings: {} })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [notice, setNotice] = useState("")
  const [section, setSection] = useState<string>("home")
  const [openSlot, setOpenSlot] = useState<string>("hero_image")
  const [openSlider, setOpenSlider] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadTarget, setUploadTarget] = useState<string | null>(null)
  const [store, setStore] = useState({ ...MARKET_STORE_DEFAULTS })
  const [storeSaving, setStoreSaving] = useState(false)

  useEffect(() => {
    fetch("/admin/marketplace/api?section=banners")
      .then((r) => r.json())
      .then((d) => {
        if (d?.banners) {
          setBanners({
            ...EMPTY_BANNERS,
            ...d.banners,
            departments: d.banners.departments || {},
            links: d.banners.links || {},
            slot_settings: d.banners.slot_settings || {},
          })
        }
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
  const setLink = (imageUrl: string, dest: string) =>
    setBanners((b) => {
      const links = { ...(b.links || {}) }
      if (dest) links[imageUrl] = dest
      else delete links[imageUrl]
      return { ...b, links }
    })
  const extrasOf = (key: SliderSlotKey): BannerSlide[] =>
    Array.isArray(banners[key]) ? (banners[key] as BannerSlide[]) : []
  const setExtras = (key: SliderSlotKey, list: BannerSlide[]) =>
    setBanners((b) => ({ ...b, [key]: list.slice(0, 10) }))
  const setSlotSlider = (key: SliderSlotKey, patch: Partial<SlotSlider>) =>
    setBanners((b) => ({
      ...b,
      slot_settings: {
        ...(b.slot_settings || {}),
        [key]: { ...slotSliderOf(b, key), ...patch },
      },
    }))

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
      if (uploadTarget.startsWith("dept:")) {
        setDept(uploadTarget.slice(5), url)
      } else if (uploadTarget.startsWith("slides:")) {
        const [, key] = uploadTarget.split(":") as [string, SliderSlotKey]
        setBanners((b) => {
          const cur = Array.isArray(b[key]) ? [...(b[key] as BannerSlide[])] : []
          if (cur.length < 10) cur.push({ image: url, link: "" })
          return { ...b, [key]: cur }
        })
      } else {
        setSlot(uploadTarget, url)
      }
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
      if (data?.banners) {
        setBanners({
          ...EMPTY_BANNERS,
          ...data.banners,
          departments: data.banners.departments || {},
          links: data.banners.links || {},
          slot_settings: data.banners.slot_settings || {},
        })
      }
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
  const liveCount = [...HOME_SLOT_IDS, ...PAGE_SLOT_IDS].filter((id) => slotValue(id).trim()).length +
    Object.keys(banners.departments || {}).length

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/avif" className="hidden" onChange={onFile} />

      {/* Sticky save bar */}
      <div className="sticky top-0 z-10 rounded-xl border bg-[#0F172A] p-3 text-white shadow-md sm:p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold sm:text-[15px]">Banners & Sliders</p>
            <p className="truncate text-[11px] text-white/60">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle" />
              {liveCount} custom banner{liveCount === 1 ? "" : "s"} live · saves go public instantly
            </p>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#F59E0B] px-5 py-2.5 text-sm font-extrabold text-[#0F172A] transition-colors hover:bg-[#D97706] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving…" : "Save banners"}
          </button>
        </div>
        {notice && (
          <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-emerald-300">
            <BadgeCheck className="h-3.5 w-3.5 shrink-0" /> {notice}
          </p>
        )}
      </div>

      {/* 1 — Homepage banners & sliders */}
      <Section
        step="1"
        title="Homepage banners"
        desc="Hero, promos + in-feed strips — each with its own link & animation"
        open={section === "home"}
        onToggle={() => setSection(section === "home" ? "" : "home")}
      >
        <div className="space-y-2.5">
          {HOME_SLOT_IDS.map((id) => {
            const slot = BANNER_SLOTS.find((s) => s.id === id)!
            const key = slidesKeyOf(id)
            const cover = slotValue(id)
            return (
              <SlotCard
                key={id}
                slot={slot}
                cover={cover}
                coverLink={cover.trim() ? banners.links?.[cover.trim()] || "" : ""}
                extras={key ? extrasOf(key) : []}
                slider={key ? slotSliderOf(banners, key) : DEFAULT_SLOT_SLIDER}
                sliderOpen={key ? openSlider === key : false}
                open={openSlot === id}
                uploading={uploading === id}
                onToggle={() => setOpenSlot(openSlot === id ? "" : id)}
                onSliderToggle={() => key && setOpenSlider(openSlider === key ? null : key)}
                onCover={(v) => setSlot(id, v)}
                onCoverLink={(v) => {
                  const c = slotValue(id).trim()
                  if (c) setLink(c, v)
                }}
                onExtras={(v) => key && setExtras(key, v)}
                onSlider={(p) => key && setSlotSlider(key, p)}
                onUploadCover={() => pickUpload(id)}
                onReset={() => setSlot(id, "")}
              />
            )
          })}
        </div>
      </Section>

      {/* 2 — Page banners */}
      <Section
        step="2"
        title="Page banners"
        desc="Category default + Shop, Deals, Best Sellers, New, Stores, Track"
        open={section === "pages"}
        onToggle={() => setSection(section === "pages" ? "" : "pages")}
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          {PAGE_SLOT_IDS.map((id) => {
            const slot = BANNER_SLOTS.find((s) => s.id === id)!
            const val = slotValue(id)
            return (
              <SingleBannerRow
                key={id}
                label={slot.label}
                sub={slot.dims}
                value={val}
                link={val.trim() ? banners.links?.[val.trim()] || "" : ""}
                uploading={uploading === id}
                onValue={(v) => setSlot(id, v)}
                onLink={(v) => {
                  const c = slotValue(id).trim()
                  if (c) setLink(c, v)
                }}
                onUpload={() => pickUpload(id)}
                onReset={() => setSlot(id, "")}
              />
            )
          })}
        </div>
        <p className="text-[11px] text-slate-500">
          Page banners show in FULL (never cropped) with the page title beneath — design any words into the image itself.
        </p>
      </Section>

      {/* 3 — Category banners */}
      <Section
        step="3"
        title="Category banners"
        desc="One image per department — empty falls back to the default above"
        open={section === "depts"}
        onToggle={() => setSection(section === "depts" ? "" : "depts")}
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          {MARKET_DEPARTMENTS.map((d) => {
            const val = banners.departments[d.slug] || ""
            const key = `dept:${d.slug}`
            return (
              <SingleBannerRow
                key={d.slug}
                label={d.name}
                sub={`${d.slug} · ${DEPT_BANNER_DIMS}`}
                value={val}
                link={val.trim() ? banners.links?.[val.trim()] || "" : ""}
                uploading={uploading === key}
                onValue={(v) => setDept(d.slug, v)}
                onLink={(v) => {
                  const c = (banners.departments[d.slug] || "").trim()
                  if (c) setLink(c, v)
                }}
                onUpload={() => pickUpload(key)}
              />
            )
          })}
        </div>
      </Section>

      {/* 4 — Promo & store */}
      <Section
        step="4"
        title="Promo & store info"
        desc="Black Friday surfaces + footer contact details"
        open={section === "more"}
        onToggle={() => setSection(section === "more" ? "" : "more")}
      >
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 py-3">
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
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm font-bold text-slate-900">Footer contact</p>
          <div className="mt-2 grid gap-2.5">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={store.contact_visible !== false}
                onChange={(e) => setStore((s) => ({ ...s, contact_visible: e.target.checked }))}
                className="h-4 w-4 accent-[#F59E0B]"
              />
              Show contact block publicly
            </label>
            <input
              value={store.address}
              onChange={(e) => setStore((s) => ({ ...s, address: e.target.value }))}
              placeholder="Coverage line — e.g. Lagos • Nairobi • Accra"
              className={`${inputCls} text-xs`}
            />
            <div className="grid gap-2.5 sm:grid-cols-2">
              <input
                value={store.phone}
                onChange={(e) => setStore((s) => ({ ...s, phone: e.target.value }))}
                placeholder="Phone"
                className={`${inputCls} text-xs`}
              />
              <input
                value={store.email}
                onChange={(e) => setStore((s) => ({ ...s, email: e.target.value }))}
                placeholder="Email"
                className={`${inputCls} text-xs`}
              />
            </div>
            <div>
              <button
                type="button"
                onClick={saveStore}
                disabled={storeSaving}
                className="inline-flex items-center gap-2 bg-[#0F172A] hover:bg-black text-white text-xs font-bold rounded-lg px-4 py-2 disabled:opacity-60"
              >
                {storeSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {storeSaving ? "Saving…" : "Save contact info"}
              </button>
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}
