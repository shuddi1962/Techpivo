"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowRight, X } from "lucide-react"
import { cleanBannerLink } from "@/lib/marketplace-banners"

interface MobileAnnouncementProps {
  enabled?: boolean
  text?: string | null
  actionText?: string | null
  actionUrl?: string | null
  bgColor?: string
  textColor?: string
  startAt?: string | null
  endAt?: string | null
}

/**
 * Mobile-only slim announcement strip beneath the header.
 *
 * Admin-configurable via Admin → Marketplace → Mobile Experience.
 * Hidden on desktop/tablet via `md:hidden`.
 */
export function MobileAnnouncement({
  enabled = false,
  text,
  actionText,
  actionUrl,
  bgColor = "#F59E0B",
  textColor = "#ffffff",
  startAt,
  endAt,
}: MobileAnnouncementProps) {
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
      window.localStorage.setItem("tp_mobile_announce_dismissed", "1")
    } catch {
      // ignore
    }
  }, [])

  const handleActionClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const url = cleanBannerLink(actionUrl || "")
      if (!url) return
      if (url.startsWith("#")) {
        const el = document.querySelector(url)
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
        return
      }
      window.location.href = url
    },
    [actionUrl]
  )

  if (!visible) return null

  return (
    <div className="md:hidden shrink-0" style={{ backgroundColor: bgColor }}>
      <div className="px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3 max-w-[1440px] mx-auto relative">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-snug" style={{ color: textColor }}>
            {text}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actionText && actionUrl && (
            <Link
              href={actionUrl}
              onClick={handleActionClick}
              passHref
              legacyBehavior
              className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shadow-sm transition-all active:scale-95`}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                color: textColor,
              }}
            >
              {actionText} <ArrowRight className="h-3 w-3" />
            </Link>
          )}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-300 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
