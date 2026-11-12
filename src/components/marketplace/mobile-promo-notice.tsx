"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { X } from "lucide-react"
import { cleanBannerLink } from "@/lib/marketplace-banners"

interface MobilePromoNoticeProps {
  enabled?: boolean
  logo?: string | null
  heading?: string | null
  description?: string | null
  buttonLabel?: string | null
  buttonUrl?: string | null
  showButton?: boolean
  showClose?: boolean
  bgColor?: string
  textColor?: string
  btnBgColor?: string
  btnTextColor?: string
  startAt?: string | null
  endAt?: string | null
}

/**
 * Mobile-only promotional notice bar at the top of the marketplace.
 *
 * Admin-configurable via Admin → Marketplace → Mobile Experience.
 * Dismissal is per-session (localStorage), not permanent.
 *
 * Hidden on desktop/tablet via `md:hidden`.
 */
export function MobilePromoNotice({
  enabled = false,
  logo,
  heading,
  description,
  buttonLabel,
  buttonUrl,
  showButton = true,
  showClose = true,
  bgColor = "#0F172A",
  textColor = "#ffffff",
  btnBgColor = "#FF6B00",
  btnTextColor = "#ffffff",
  startAt,
  endAt,
}: MobilePromoNoticeProps) {
  const [dismissed, setDismissed] = useState(false)

  const now = Date.now()
  const inWindow = useMemo(() => {
    if (startAt && now < Date.parse(startAt)) return false
    if (endAt && now > Date.parse(endAt)) return false
    return true
  }, [startAt, endAt, now])

  const visible = useMemo(
    () => enabled && inWindow && !dismissed,
    [enabled, inWindow, dismissed]
  )

  const handleClose = useCallback(() => {
    setDismissed(true)
    try {
      window.localStorage.setItem("tp_mobile_promo_dismissed", "1")
    } catch {
      // ignore
    }
  }, [])

  const handleButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const url = cleanBannerLink(buttonUrl || "")
      if (!url) return
      if (url.startsWith("#")) {
        // Anchor — scroll into view
        const el = document.querySelector(url)
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
        return
      }
      window.location.href = url
    },
    [buttonUrl]
  )

  if (!visible) return null

  const textStyle = useMemo(
    () => ({ color: textColor }),
    [textColor]
  )
  const btnStyle = useMemo(
    () => ({ backgroundColor: btnBgColor, color: btnTextColor }),
    [btnBgColor, btnTextColor]
  )
  const containerStyle = useMemo(
    () => ({ backgroundColor: bgColor }),
    [bgColor]
  )

  return (
    <div className="md:hidden shrink-0" style={containerStyle}>
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3 max-w-[1440px] mx-auto relative">
        {/* LEFT: Logo */}
        {logo && (
          <div className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo}
              alt=""
              loading="eager"
              decoding="async"
              className="h-8 w-auto rounded-md object-contain"
            />
          </div>
        )}

        {/* MIDDLE: Heading + description */}
        <div className="min-w-0 flex-1">
          {heading && (
            <p
              className="text-sm font-bold leading-snug"
              style={textStyle}
            >
              {heading}
            </p>
          )}
          {description && (
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* RIGHT: Button + Close */}
        <div className="flex items-center gap-2 shrink-0">
          {showButton && buttonLabel && (
            <button
              type="button"
              onClick={handleButtonClick}
              aria-label={buttonLabel}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-all active:scale-95`}
              style={btnStyle}
            >
              {buttonLabel}
            </button>
          )}
          {showClose && (
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
