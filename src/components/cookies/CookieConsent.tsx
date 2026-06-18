"use client"

import { useState, useEffect } from "react"
import { getConsent, saveConsent, type ConsentPreferences } from "@/lib/consent"
import { X } from "lucide-react"

export function CookieConsent() {
  const [show, setShow] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [prefs, setPrefs] = useState<ConsentPreferences>({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  })

  useEffect(() => {
    const existing = getConsent()
    if (!existing) setShow(true)
  }, [])

  if (!show) return null

  const acceptAll = () => {
    saveConsent({ functional: true, analytics: true, marketing: true })
    setShow(false)
  }

  const rejectAll = () => {
    saveConsent({ functional: false, analytics: false, marketing: false })
    setShow(false)
  }

  const savePreferences = () => {
    saveConsent(prefs)
    setShow(false)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="mx-auto max-w-3xl bg-background border border-border rounded-2xl shadow-2xl p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="font-bold text-sm">🍪 We use cookies</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              We use cookies to enhance your experience, analyze traffic, and serve personalized ads.
              Choose what you share.
            </p>
          </div>
          <button
            onClick={() => setShow(false)}
            className="p-1 rounded-full hover:bg-muted transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked disabled className="accent-primary" />
              <div className="text-sm">
                <span className="font-medium">Necessary</span>
                <p className="text-xs text-muted-foreground">Required for basic site functionality</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.functional}
                onChange={(e) => setPrefs((p) => ({ ...p, functional: e.target.checked }))}
                className="accent-primary"
              />
              <div className="text-sm">
                <span className="font-medium">Functional</span>
                <p className="text-xs text-muted-foreground">Remember preferences and settings</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.analytics}
                onChange={(e) => setPrefs((p) => ({ ...p, analytics: e.target.checked }))}
                className="accent-primary"
              />
              <div className="text-sm">
                <span className="font-medium">Analytics</span>
                <p className="text-xs text-muted-foreground">Help us improve with usage data</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.marketing}
                onChange={(e) => setPrefs((p) => ({ ...p, marketing: e.target.checked }))}
                className="accent-primary"
              />
              <div className="text-sm">
                <span className="font-medium">Marketing</span>
                <p className="text-xs text-muted-foreground">Personalized ads from Google AdSense</p>
              </div>
            </label>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button
            onClick={acceptAll}
            className="px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            Accept All
          </button>
          <button
            onClick={rejectAll}
            className="px-5 py-2 border border-border text-sm font-medium rounded-lg hover:bg-muted transition-colors"
          >
            Reject All
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-5 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? "Show less" : "Customize"}
          </button>
          {expanded && (
            <button
              onClick={savePreferences}
              className="px-5 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Save Preferences
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
