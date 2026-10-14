"use client"

import { Fragment, useEffect, useRef, useState } from "react"
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
  SIDEBAR_BANNER_DIMS,
  DEFAULT_SLOT_SLIDER,
  EMPTY_BANNERS,
  MAX_POPUP_CAMPAIGNS,
  POPUP_FREQUENCIES,
  POPUP_MODES,
  POPUP_SIZES,
  POPUP_STYLES,
  campaignView,
  defaultPopupCampaign,
  isoToLocalInput,
  SLIDER_EASINGS,
  bannerLinkLabel,
  cleanBannerLink,
  easingCss,
  slotSliderOf,
  type BannerSlide,
  type BannerTransition,
  type MarketBanners,
  type PopupCampaign,
  type PopupStatSummary,
  type PopupFrequency,
  type PopupMode,
  type PopupSize,
  type PopupStyle,
  type SliderEasing,
  type SliderSlotKey,
  type SlotSlider,
} from "@/lib/marketplace-banners"
import { BannerSlider } from "@/components/marketplace/banner-slider"
import { WelcomePopupCard } from "@/components/marketplace/welcome-popup"
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
function campaignStatus(c: PopupCampaign, rank: number): { dot: string; text: string } {
  const now = Date.now()
  if (!c.enabled) return { dot: "bg-slate-300", text: "Off" }
  if (c.start_at && now < Date.parse(c.start_at)) {
    const d = new Date(c.start_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    return { dot: "bg-sky-400", text: `Scheduled — starts ${d} (hidden until then)` }
  }
  if (c.end_at && now > Date.parse(c.end_at)) return { dot: "bg-slate-300", text: "Ended" }
  return {
    dot: "bg-emerald-500",
    text: `#${rank} · ${c.mode === "banner" ? "Banner" : "Card"} · ${POPUP_FREQUENCIES.find((f) => f.id === c.frequency)?.label || c.frequency}`,
  }
}

// Full editor for one popup campaign: mode, image, wording, button,
// design, schedule + timing, and a live preview. Module-level so inputs
// never lose focus while typing.
function CampaignEditor({
  c,
  stat,
  onChange,
  onUploadImage,
  uploading,
}: {
  c: PopupCampaign
  stat?: PopupStatSummary | null
  onChange: (patch: Partial<PopupCampaign>) => void
  onUploadImage: () => void
  uploading: boolean
}) {
  const [previewOn, setPreviewOn] = useState(true)
  const view = campaignView(c)
  return (
    <div className="space-y-3 border-t bg-slate-50/60 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-semibold text-sky-900">
        {stat && stat.views > 0 ? (
          <>
            <span>👁 {stat.views} views (30d)</span>
            <span>🖱 {stat.clicks} clicks</span>
            <span>✕ {stat.closes} closes</span>
            <span className="font-extrabold">CTR {stat.ctr}%</span>
            {stat.lastShownAt && (
              <span className="text-sky-700">
                last shown {new Date(stat.lastShownAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </>
        ) : (
          <span className="text-sky-700">No views yet — numbers appear here once shoppers see this popup.</span>
        )}
      </div>
      <div className="rounded-xl border bg-white p-4">
        <p className="text-sm font-bold text-slate-900">Popup style — two ways to show it</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {POPUP_MODES.map((m) => {
            const active = c.mode === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onChange({ mode: m.id as PopupMode })}
                aria-pressed={active}
                className={`rounded-xl border-2 p-3 text-left transition-colors ${active ? "border-[#F59E0B] bg-amber-50/60" : "border-[#E2E8F0] hover:border-slate-300"}`}
              >
                <span className="block text-sm font-extrabold text-slate-900">
                  {m.id === "card" ? "Card popup" : "Banner popup"}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                  {m.id === "card"
                    ? "Image (optional) + badge, title, message, points + buttons."
                    : "Your uploaded banner fills the whole popup — no text, no buttons. It opens the button link."}
                </span>
              </button>
            )
          })}
        </div>
        {c.mode === "banner" && !c.image.trim() && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            Upload a banner image below — banner mode falls back to the card until an image is set.
          </p>
        )}
      </div>
      <div className="rounded-xl border bg-white p-4">
        <p className="text-sm font-bold text-slate-900">Popup image {c.mode === "banner" ? "(the popup itself)" : "(optional header art)"}</p>
        <p className="text-[11px] text-slate-500">800 × 320 px or any portrait/square art. Empty in card mode = gradient header.</p>
        <div className="mt-2 flex gap-2">
          <input
            value={c.image}
            onChange={(e) => onChange({ image: e.target.value })}
            placeholder="https://… (empty = no image)"
            className={`${inputCls} min-w-0 flex-1 text-xs`}
          />
          <button type="button" onClick={onUploadImage} disabled={uploading} className={miniBtn}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            {uploading ? "…" : "Upload"}
          </button>
        </div>
        {c.image.trim() && isUrl(c.image) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.image.trim()} alt="Popup preview" className="mt-2 h-32 w-full rounded-lg border object-cover" loading="lazy" />
        )}
      </div>
      <div className="rounded-xl border bg-white p-4">
        <p className="text-sm font-bold text-slate-900">Wording + button</p>
        <div className="mt-2 grid gap-2.5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Campaign name (admin only)</span>
              <input
                value={c.name}
                onChange={(e) => onChange({ name: e.target.value.slice(0, 60) })}
                className={`${inputCls} mt-1 text-xs`}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Badge text</span>
              <input
                value={c.kicker}
                onChange={(e) => onChange({ kicker: e.target.value })}
                placeholder="Welcome Offer"
                className={`${inputCls} mt-1 text-xs`}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Title</span>
            <input
              value={c.title}
              onChange={(e) => onChange({ title: e.target.value })}
              className={`${inputCls} mt-1 text-xs`}
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Message</span>
            <textarea
              value={c.message}
              onChange={(e) => onChange({ message: e.target.value })}
              rows={2}
              className={`${inputCls} mt-1 text-xs`}
            />
          </label>
          {[0, 1, 2].map((i) => (
            <label key={i} className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Point {i + 1}</span>
              <input
                value={c.points[i] || ""}
                onChange={(e) => {
                  const next = [...c.points, "", "", ""].slice(0, 3)
                  next[i] = e.target.value
                  onChange({ points: next })
                }}
                className={`${inputCls} mt-1 text-xs`}
              />
            </label>
          ))}
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Button text</span>
              <input
                value={c.cta_text}
                onChange={(e) => onChange({ cta_text: e.target.value })}
                className={`${inputCls} mt-1 text-xs`}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Dismiss text</span>
              <input
                value={c.dismiss_text}
                onChange={(e) => onChange({ dismiss_text: e.target.value })}
                className={`${inputCls} mt-1 text-xs`}
              />
            </label>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Button opens</p>
            <LinkField value={c.cta_link} onChange={(v) => onChange({ cta_link: v || "#flash-deals" })} />
          </div>
        </div>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <p className="text-sm font-bold text-slate-900">Design</p>
        <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Style</span>
            <select
              value={c.style}
              onChange={(e) => onChange({ style: e.target.value as PopupStyle })}
              className={`${inputCls} mt-1 text-xs`}
            >
              {POPUP_STYLES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Size</span>
            <select
              value={c.size}
              onChange={(e) => onChange({ size: e.target.value as PopupSize })}
              className={`${inputCls} mt-1 text-xs`}
            >
              {POPUP_SIZES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-2">
          {(
            [
              ["show_kicker", "Badge"],
              ["show_title", "Title"],
              ["show_message", "Message"],
              ["show_points", "Points"],
              ["show_dismiss", "Dismiss button"],
            ] as Array<[keyof PopupCampaign, string]>
          ).map(([key, label]) => (
            <label key={key} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={!!c[key]}
                onChange={(e) => onChange({ [key]: e.target.checked } as Partial<PopupCampaign>)}
                className="h-3.5 w-3.5 accent-[#F59E0B]"
              />
              {label}
            </label>
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <p className="text-sm font-bold text-slate-900">Schedule + timing</p>
        <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Starts — your time (optional)</span>
            <input
              type="datetime-local"
              value={isoToLocalInput(c.start_at)}
              onChange={(e) => onChange({ start_at: e.target.value ? new Date(e.target.value).toISOString() : "" })}
              className={`${inputCls} mt-1 text-xs`}
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Ends — your time (optional)</span>
            <input
              type="datetime-local"
              value={isoToLocalInput(c.end_at)}
              onChange={(e) => onChange({ end_at: e.target.value ? new Date(e.target.value).toISOString() : "" })}
              className={`${inputCls} mt-1 text-xs`}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Sale countdown ends — your time (optional)</span>
            <input
              type="datetime-local"
              value={isoToLocalInput(c.countdown_end_at)}
              onChange={(e) => onChange({ countdown_end_at: e.target.value ? new Date(e.target.value).toISOString() : "" })}
              className={`${inputCls} mt-1 text-xs`}
            />
            <span className="text-[11px] text-slate-400">Shows a live “Ends in …” urgency timer inside the popup, like big-brand sale popups. Empty = no timer.</span>
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Show it…</span>
            <select
              value={c.frequency}
              onChange={(e) => onChange({ frequency: e.target.value as PopupFrequency })}
              className={`${inputCls} mt-1 text-xs`}
            >
              {POPUP_FREQUENCIES.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
            <span className="text-[11px] text-slate-400">Twice-daily, daily and weekly are remembered on the shopper&apos;s device.</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Delay (s)</span>
              <input
                type="number"
                min={0}
                max={30}
                value={c.delay_sec}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  onChange({ delay_sec: Number.isFinite(n) ? Math.min(30, Math.max(0, Math.round(n))) : 1 })
                }}
                className={`${inputCls} mt-1 text-xs`}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Auto-close (s)</span>
              <input
                type="number"
                min={0}
                max={120}
                value={c.autoclose_sec}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  onChange({ autoclose_sec: Number.isFinite(n) ? Math.min(120, Math.max(0, Math.round(n))) : 0 })
                }}
                className={`${inputCls} mt-1 text-xs`}
              />
            </label>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">0 delay = immediately · 0 auto-close = stays until dismissed.</p>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900">Live preview — exactly as shoppers see it</p>
          <button
            type="button"
            onClick={() => setPreviewOn(true)}
            className="rounded-lg border px-2.5 py-1.5 text-xs font-bold hover:bg-slate-50"
          >
            Replay
          </button>
        </div>
        {previewOn ? (
          <div className="flex justify-center rounded-xl bg-slate-900/[0.04] p-4">
            <WelcomePopupCard b={view} countdownEndAt={c.countdown_end_at} onClose={() => setPreviewOn(false)} preview />
          </div>
        ) : (
          <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-xs text-slate-500">
            Preview dismissed — hit Replay to see it again.
          </p>
        )}
      </div>
    </div>
  )
}

const HOME_SLOT_IDS = ["hero_image", "promo_image", "promo_deals_image", "promo_new_image", "strip1_image", "strip2_image"]
const PAGE_SLOT_IDS = ["category_default", "shop_image", "deals_image", "best_sellers_image", "new_arrivals_image", "top_stores_image", "track_image"]

function slidesKeyOf(slotId: string): SliderSlotKey | null {
  const slot = BANNER_SLOTS.find((s) => s.id === slotId)
  return slot && "slidesKey" in slot ? (slot.slidesKey as SliderSlotKey) : null
}

export function MarketplaceBannersTab() {
  const [banners, setBanners] = useState<MarketBanners>({ ...EMPTY_BANNERS, departments: {}, sidebar_banners: {}, links: {}, slot_settings: {} })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [notice, setNotice] = useState("")
  const [section, setSection] = useState<string>("home")
  const [openCampaign, setOpenCampaign] = useState<string | null>(null)
  const [stats, setStats] = useState<Record<string, PopupStatSummary>>({})
  const loadStats = async () => {
    try {
      const r = await fetch("/admin/marketplace/api?section=popup-stats")
      const d = await r.json().catch(() => null)
      if (r.ok && d?.stats) setStats(d.stats as Record<string, PopupStatSummary>)
    } catch {
      // stats simply stay empty until the next refresh
    }
  }
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
            sidebar_banners: d.banners.sidebar_banners || {},
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
    loadStats()
    const poll = setInterval(loadStats, 60000)
    return () => clearInterval(poll)
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

  const patchCampaign = (id: string, patch: Partial<PopupCampaign>) =>
    setBanners((b) => ({
      ...b,
      popup_campaigns: (b.popup_campaigns || []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }))
  const moveCampaign = (id: string, dir: -1 | 1) =>
    setBanners((b) => {
      const list = [...(b.popup_campaigns || [])]
      const i = list.findIndex((c) => c.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= list.length) return b
      ;[list[i], list[j]] = [list[j], list[i]]
      return { ...b, popup_campaigns: list }
    })
  const removeCampaign = (id: string) => {
    if (!window.confirm("Delete this popup campaign? Shoppers stop seeing it on next save.")) return
    if (openCampaign === id) setOpenCampaign(null)
    setBanners((b) => ({ ...b, popup_campaigns: (b.popup_campaigns || []).filter((c) => c.id !== id) }))
  }

  const setDept = (slug: string, url: string) =>
    setBanners((b) => {
      const departments = { ...b.departments }
      if (url.trim()) departments[slug] = url.trim()
      else delete departments[slug]
      return { ...b, departments }
    })

  const setSideBanner = (slug: string, url: string) =>
    setBanners((b) => {
      const sidebar_banners = { ...(b.sidebar_banners || {}) }
      if (url.trim()) sidebar_banners[slug] = url.trim()
      else delete sidebar_banners[slug]
      return { ...b, sidebar_banners }
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
      } else if (uploadTarget.startsWith("popupimg:")) {
        patchCampaign(uploadTarget.slice(9), { image: url })
      } else if (uploadTarget.startsWith("side:")) {
        setSideBanner(uploadTarget.slice(5), url)
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
          sidebar_banners: data.banners.sidebar_banners || {},
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
    <div className="w-full space-y-3">
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
        <div className="grid gap-2.5 xl:grid-cols-2">
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
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
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

      {/* 3 — Category banners (page banner + showcase sidebar per dept) */}
      <Section
        step="3"
        title="Category banners"
        desc="Page banner + showcase sidebar per department — empty falls back to defaults"
        open={section === "depts"}
        onToggle={() => setSection(section === "depts" ? "" : "depts")}
      >
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {MARKET_DEPARTMENTS.map((d) => {
            const val = banners.departments[d.slug] || ""
            const key = `dept:${d.slug}`
            const side = banners.sidebar_banners?.[d.slug] || ""
            const sideKey = `side:${d.slug}`
            return (
              <Fragment key={d.slug}>
                <SingleBannerRow
                  label={d.name}
                  sub={`Page banner · ${DEPT_BANNER_DIMS}`}
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
                <SingleBannerRow
                  label={`${d.name} sidebar`}
                  sub={`Showcase sidebar · ${SIDEBAR_BANNER_DIMS}`}
                  value={side}
                  link={side.trim() ? banners.links?.[side.trim()] || "" : ""}
                  uploading={uploading === sideKey}
                  onValue={(v) => setSideBanner(d.slug, v)}
                  onLink={(v) => {
                    const c = (banners.sidebar_banners?.[d.slug] || "").trim()
                    if (c) setLink(c, v)
                  }}
                  onUpload={() => pickUpload(sideKey)}
                />
              </Fragment>
            )
          })}
        </div>
        <p className="text-[11px] text-slate-500">
          The sidebar banner replaces the SALE panel inside that department&apos;s homepage showcase — uploaded art shows clean with no overlay text or button and opens its own link.
        </p>
      </Section>

      {/* 4 — Welcome popups (multi-campaign) */}
      <Section
        step="4"
        title="Welcome popups"
        desc="Run several campaigns at once — top of the list wins, one shows per visit"
        open={section === "popup"}
        onToggle={() => setSection(section === "popup" ? "" : "popup")}
      >
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] leading-relaxed text-sky-800">
          <p className="min-w-0 flex-1">
            Campaigns never fight: shoppers see <strong>one</strong> popup per visit, and it never re-pops on
            background refreshes. When several campaigns are due at once they <strong>take turns</strong> visit by
            visit (starting at the top) — reorder with ↑ ↓ to set who goes first. Testing? Use an incognito window:
            closing a daily/weekly popup hides it on that device until its cap lifts, and a future start date hides
            it until then (the row says Scheduled).
          </p>
          <button
            type="button"
            onClick={loadStats}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-sky-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-sky-800 hover:bg-sky-100"
          >
            <RotateCcw className="h-3 w-3" /> Refresh stats
          </button>
        </div>
        <div className="space-y-2.5">
          {(banners.popup_campaigns || []).map((c, i) => {
            const st = campaignStatus(c, i + 1)
            const expanded = openCampaign === c.id
            const s = stats[c.id]
            return (
              <div key={c.id} className={`overflow-hidden rounded-xl border bg-white ${expanded ? "border-amber-300 shadow-sm" : ""}`}>
                <div className="flex items-center gap-2.5 p-3">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`} title={st.text} />
                  <button type="button" onClick={() => setOpenCampaign(expanded ? null : c.id)} aria-expanded={expanded} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-bold text-slate-900">{c.name || "Untitled"}</span>
                    <span className="block truncate text-[11px] text-slate-500">
                      {st.text}{s && s.views > 0 ? ` · 👁 ${s.views} · 🖱 ${s.clicks} · CTR ${s.ctr}%` : ""}
                    </span>
                  </button>
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] font-bold text-slate-600">
                    <input
                      type="checkbox"
                      checked={c.enabled}
                      onChange={(e) => patchCampaign(c.id, { enabled: e.target.checked })}
                      className="h-4 w-4 accent-[#F59E0B]"
                    />
                    {c.enabled ? "On" : "Off"}
                  </label>
                  <button type="button" title="Higher priority" onClick={() => moveCampaign(c.id, -1)} disabled={i === 0} className="rounded-md border p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" title="Lower priority" onClick={() => moveCampaign(c.id, 1)} disabled={i === (banners.popup_campaigns || []).length - 1} className="rounded-md border p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" title="Delete campaign" onClick={() => removeCampaign(c.id)} className="rounded-md border p-1.5 text-red-500 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {expanded && (
                  <CampaignEditor
                    c={c}
                    stat={stats[c.id] || null}
                    onChange={(p) => patchCampaign(c.id, p)}
                    onUploadImage={() => pickUpload(`popupimg:${c.id}`)}
                    uploading={uploading === `popupimg:${c.id}`}
                  />
                )}
              </div>
            )
          })}
        </div>
        {(banners.popup_campaigns || []).length < MAX_POPUP_CAMPAIGNS ? (
          <button
            type="button"
            onClick={() => {
              const c = defaultPopupCampaign(`Campaign ${(banners.popup_campaigns || []).length + 1}`)
              setBanners((b) => ({ ...b, popup_campaigns: [...(b.popup_campaigns || []), c] }))
              setOpenCampaign(c.id)
              flash("Campaign added — expand it to design, then Save banners")
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:border-[#F59E0B] hover:text-[#0F172A]"
          >
            <Plus className="h-3.5 w-3.5" /> Add popup campaign
          </button>
        ) : (
          <p className="text-xs text-slate-500">Maximum {MAX_POPUP_CAMPAIGNS} campaigns — delete one to add another.</p>
        )}
      </Section>

      {/* 5 — Promo & store */}
      <Section
        step="5"
        title="Promo & store info"
        desc="Top promo bar, flash sale + footer contact details"
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
          <p className="text-sm font-bold text-slate-900">Top promo bar</p>
          <p className="text-xs text-slate-500">The strip above the store header — badge, messages and bar color. Live instantly on save.</p>
          <div className="mt-2 grid gap-2.5">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <input
                value={banners.promo_badge_text}
                onChange={(e) => setBanners((b) => ({ ...b, promo_badge_text: e.target.value }))}
                placeholder="Badge — e.g. Limited Deal"
                maxLength={40}
                className={`${inputCls} text-xs`}
              />
              <input
                value={banners.promo_message_mobile}
                onChange={(e) => setBanners((b) => ({ ...b, promo_message_mobile: e.target.value }))}
                placeholder="Short message (mobile)"
                maxLength={80}
                className={`${inputCls} text-xs`}
              />
            </div>
            <input
              value={banners.promo_message}
              onChange={(e) => setBanners((b) => ({ ...b, promo_message: e.target.value }))}
              placeholder="Message (desktop) — e.g. Black Friday Sale! Special offers up to 50% Off at TechPivo Market"
              maxLength={140}
              className={`${inputCls} text-xs`}
            />
            <div className="grid gap-2.5 sm:grid-cols-3">
              {([
                { k: "promo_bar_from", label: "Bar color (from)" },
                { k: "promo_bar_to", label: "Bar color (to)" },
                { k: "promo_badge_bg", label: "Badge color" },
              ] as const).map((f) => (
                <label key={f.k} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(banners[f.k]) ? banners[f.k] : "#1668DC"}
                    onChange={(e) => setBanners((b) => ({ ...b, [f.k]: e.target.value }) as MarketBanners)}
                    className="h-8 w-10 cursor-pointer rounded border"
                    aria-label={f.label}
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-slate-900">Flash sale section</p>
              <p className="text-xs text-slate-500">Homepage countdown banner — badge, headline, colors and end date. Live instantly on save.</p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={banners.flash_enabled !== false}
                onChange={(e) => setBanners((b) => ({ ...b, flash_enabled: e.target.checked }))}
                className="h-4 w-4 accent-[#F59E0B]"
              />
              Show
            </label>
          </div>
          <div className="mt-2 grid gap-2.5">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <input
                value={banners.flash_badge}
                onChange={(e) => setBanners((b) => ({ ...b, flash_badge: e.target.value }))}
                placeholder="Badge — e.g. Flash Sale"
                maxLength={40}
                className={`${inputCls} text-xs`}
              />
              <input
                value={banners.flash_title}
                onChange={(e) => setBanners((b) => ({ ...b, flash_title: e.target.value }))}
                placeholder="Headline — e.g. Special Offer — Up to 50% Off"
                maxLength={80}
                className={`${inputCls} text-xs`}
              />
            </div>
            <input
              value={banners.flash_subtitle}
              onChange={(e) => setBanners((b) => ({ ...b, flash_subtitle: e.target.value }))}
              placeholder="Sub-line — e.g. Hurry — discounted stock goes fast"
              maxLength={140}
              className={`${inputCls} text-xs`}
            />
            <div className="grid gap-2.5 sm:grid-cols-3">
              {([
                { k: "flash_bg_from", label: "Banner color (from)" },
                { k: "flash_bg_to", label: "Banner color (to)" },
              ] as const).map((f) => (
                <label key={f.k} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(banners[f.k]) ? banners[f.k] : "#DC2626"}
                    onChange={(e) => setBanners((b) => ({ ...b, [f.k]: e.target.value }) as MarketBanners)}
                    className="h-8 w-10 cursor-pointer rounded border"
                    aria-label={f.label}
                  />
                  {f.label}
                </label>
              ))}
              <label className="text-xs font-semibold text-slate-600">
                <span className="mb-1 block">Countdown ends</span>
                <input
                  type="datetime-local"
                  value={isoToLocalInput(banners.flash_end_at)}
                  onChange={(e) => setBanners((b) => ({ ...b, flash_end_at: e.target.value ? new Date(e.target.value).toISOString() : "" }))}
                  className={`${inputCls} text-xs`}
                  aria-label="Countdown end date"
                />
              </label>
            </div>
            <p className="text-[11px] text-slate-500">End date empty = rolling 2-day countdown. Ended = timer holds at 00 until you set a new date.</p>
          </div>
        </div>
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
