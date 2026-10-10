"use client"

import Link from "next/link"
import { ArrowRight, BadgeCheck, ShieldCheck, Truck, X } from "lucide-react"
import type { MarketBanners } from "@/lib/marketplace-banners"

// Theme map: header background, header text tones, badge + button styles.
const THEMES: Record<string, { header: string; title: string; msg: string; badge: string; cta: string }> = {
  dark: {
    header: "linear-gradient(140deg, #0F172A 0%, #7F1D1D 100%)",
    title: "text-white",
    msg: "text-white/80",
    badge: "bg-[#DC2626] text-white",
    cta: "bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706]",
  },
  crimson: {
    header: "linear-gradient(140deg, #DC2626 0%, #7F1D1D 100%)",
    title: "text-white",
    msg: "text-white/85",
    badge: "bg-[#0F172A] text-white",
    cta: "bg-[#DC2626] text-white hover:bg-[#991B1B]",
  },
  amber: {
    header: "linear-gradient(120deg, #F59E0B 0%, #EA580C 100%)",
    title: "text-[#0F172A]",
    msg: "text-[#0F172A]/75",
    badge: "bg-[#0F172A] text-white",
    cta: "bg-[#0F172A] text-white hover:bg-black",
  },
  light: {
    header: "#F8FAFC",
    title: "text-[#0F172A]",
    msg: "text-slate-500",
    badge: "bg-[#0F172A] text-white",
    cta: "bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706]",
  },
}

const POINT_ICONS = [ShieldCheck, BadgeCheck, Truck]
const POINT_COLORS = ["text-[#10B981]", "text-[#F59E0B]", "text-[#0F172A]"]

// The welcome popup card — shared by the storefront overlay and the
// admin live preview. Every block (badge/title/message/points/dismiss)
// can be switched off in Admin → Banners → Welcome popup, so the same
// card doubles as a banner-only marketing popup.
export function WelcomePopupCard({
  b,
  onClose,
  preview = false,
}: {
  b: MarketBanners
  onClose: () => void
  /** Preview mode (admin): the button just closes the preview, never navigates. */
  preview?: boolean
}) {
  const t = THEMES[b.popup_style] || THEMES.dark
  const size = b.popup_size === "sm" ? "max-w-sm" : b.popup_size === "lg" ? "max-w-lg" : "max-w-md"
  const hasImage = b.popup_image.trim().length > 0
  // Banner mode: the uploaded image IS the popup — no writeup, no
  // buttons. The whole banner opens the button link; X closes it.
  if (b.popup_mode === "banner" && hasImage) {
    const body = (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={b.popup_image.trim()} alt={b.popup_title || "Special offer"} className="block w-full object-cover" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close popup"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          <X className="h-4 w-4" />
        </button>
      </>
    )
    return (
      <div className={`relative w-full ${size} overflow-hidden rounded-2xl bg-white shadow-2xl`}>
        {preview ? (
          <div onClick={onClose} role="button" tabIndex={0} aria-label={b.popup_title || "Special offer"} className="block w-full cursor-pointer">
            {body}
          </div>
        ) : (
          <Link href={b.popup_cta_link} onClick={onClose} aria-label={b.popup_title || "Special offer"} className="block">
            {body}
          </Link>
        )}
      </div>
    )
  }
  const showHeader =
    (b.popup_show_kicker && b.popup_kicker.trim()) || (b.popup_show_title && b.popup_title) || (b.popup_show_message && b.popup_message)
  const showPoints = b.popup_show_points && b.popup_points.length > 0
  const closeOnImage = hasImage
  return (
    <div className={`relative w-full ${size} overflow-hidden rounded-2xl bg-white shadow-2xl`}>
      {hasImage && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.popup_image.trim()} alt="" className="block h-40 w-full object-cover" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close popup"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {showHeader && (
        <div className={`relative p-6 ${b.popup_style === "light" ? "border-b border-[#E2E8F0]" : ""}`} style={{ background: t.header }}>
          {b.popup_style === "dark" && <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#F59E0B]/20 blur-2xl" />}
          {!closeOnImage && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close popup"
              className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                b.popup_style === "amber" || b.popup_style === "light"
                  ? "bg-black/10 text-[#0F172A] hover:bg-black/20"
                  : "bg-white/10 text-white hover:bg-white/25"
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {b.popup_show_kicker && b.popup_kicker.trim() && (
            <span className={`inline-block text-[11px] font-bold uppercase px-2.5 py-1 rounded-md ${t.badge}`}>
              {b.popup_kicker}
            </span>
          )}
          {b.popup_show_title && b.popup_title && (
            <h2 className={`mt-3 text-2xl font-extrabold tracking-tight ${t.title}`}>
              {b.popup_title}
            </h2>
          )}
          {b.popup_show_message && b.popup_message && (
            <p className={`mt-1 text-sm ${t.msg}`}>
              {b.popup_message}
            </p>
          )}
        </div>
      )}
      {!hasImage && !showHeader && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close popup"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <div className="space-y-2 p-6">
        {showPoints &&
          b.popup_points.map((pt, i) => {
            const Icon = POINT_ICONS[i % POINT_ICONS.length]
            return (
              <div key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                <Icon className={`h-4 w-4 shrink-0 ${POINT_COLORS[i % POINT_COLORS.length]}`} />
                {pt}
              </div>
            )
          })}
        <div className="flex items-center gap-2 pt-3">
          {preview ? (
            <button
              type="button"
              onClick={onClose}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${t.cta}`}
            >
              {b.popup_cta_text} <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Link
              href={b.popup_cta_link}
              onClick={onClose}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${t.cta}`}
            >
              {b.popup_cta_text} <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          {b.popup_show_dismiss && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#0F172A]"
            >
              {b.popup_dismiss_text}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
