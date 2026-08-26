"use client"

import { useEffect, useState } from "react"
import { Settings, ChevronDown, ChevronUp, Shield } from "lucide-react"

const CONSENT_KEY = "techpivo_consent"
const CONSENT_VERSION = 2

type ConsentLevel = "all" | "custom" | null
type CookieChoice = {
  essential: true
  analytics: boolean
  advertising: boolean
  preference: boolean
}

const DEFAULT_ACCEPT: CookieChoice = { essential: true, analytics: true, advertising: true, preference: true }
const DEFAULT_REJECT: CookieChoice = { essential: true, analytics: false, advertising: false, preference: false }

function getStoredConsent(): { level: ConsentLevel; choices: CookieChoice } | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.version !== CONSENT_VERSION) return null
    return { level: parsed.level, choices: parsed.choices }
  } catch {
    return null
  }
}

function storeConsent(level: ConsentLevel, choices: CookieChoice) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify({ level, choices, version: CONSENT_VERSION, ts: Date.now() }))
}

function applyConsent(choices: CookieChoice) {
  const w = window as any
  w.dataLayer = w.dataLayer || []
  function gtag(...args: unknown[]) { w.dataLayer.push(args) }
  gtag("consent", "update", {
    analytics_storage: choices.analytics ? "granted" : "denied",
    ad_storage: choices.advertising ? "granted" : "denied",
    ad_user_data: choices.advertising ? "granted" : "denied",
    ad_personalization: choices.advertising ? "granted" : "denied",
    personalization_storage: choices.preference ? "granted" : "denied",
  })
}

export function CookieConsentBanner() {
  const [stored, setStored] = useState<{ level: ConsentLevel; choices: CookieChoice } | null>(null)
  const [show, setShow] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const [custom, setCustom] = useState<CookieChoice>(DEFAULT_ACCEPT)

  useEffect(() => {
    const s = getStoredConsent()
    setStored(s)
    if (!s) setShow(true)
  }, [])

  function handleAcceptAll() {
    storeConsent("all", DEFAULT_ACCEPT)
    applyConsent(DEFAULT_ACCEPT)
    setShow(false)
  }

  function handleRejectAll() {
    storeConsent("custom", DEFAULT_REJECT)
    applyConsent(DEFAULT_REJECT)
    setShow(false)
  }

  function handleSaveCustom() {
    const choices: CookieChoice = { essential: true, analytics: custom.analytics, advertising: custom.advertising, preference: custom.preference }
    storeConsent("custom", choices)
    applyConsent(choices)
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] border-t bg-card/95 backdrop-blur-md shadow-2xl">
      <div className="mx-auto max-w-6xl px-4 py-5">
        {/* Main row */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 flex-1">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 border border-accent/20">
              <Shield className="h-4 w-4 text-accent" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground mb-1">We value your privacy</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                We use cookies to improve your experience, analyze site traffic, and serve personalized ads.
                You can accept all cookies, reject non-essential ones, or customize your preferences.
                See our{" "}
                <a href="/cookies-policy" className="font-medium text-accent underline underline-offset-2 hover:no-underline">
                  Cookies Policy
                </a>{" "}
                for full details.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 flex-wrap">
            <button
              onClick={handleRejectAll}
              className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Reject All
            </button>
            <button
              onClick={() => setShowCustomize(!showCustomize)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              Customize
              {showCustomize ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            <button
              onClick={handleAcceptAll}
              className="rounded-lg bg-accent px-5 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Accept All
            </button>
          </div>
        </div>

        {/* Customize panel */}
        {showCustomize && (
          <div className="mt-4 border-t border-border pt-4 space-y-3">
            {/* Essential */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Essential Cookies</p>
                <p className="text-xs text-muted-foreground">Required for the site to function. Cannot be disabled.</p>
              </div>
              <div className="flex h-6 w-11 items-center rounded-full bg-emerald-500 cursor-not-allowed">
                <div className="h-4 w-4 translate-x-6 rounded-full bg-white shadow" />
              </div>
            </div>

            {/* Analytics */}
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Analytics Cookies</p>
                <p className="text-xs text-muted-foreground">Help us understand how visitors use the site (Google Analytics).</p>
              </div>
              <button
                onClick={() => setCustom(c => ({ ...c, analytics: !c.analytics }))}
                className={`flex h-6 w-11 items-center rounded-full transition-colors ${custom.analytics ? "bg-accent" : "bg-gray-300 dark:bg-gray-600"}`}
                role="switch"
                aria-checked={custom.analytics}
              >
                <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${custom.analytics ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {/* Advertising */}
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Advertising Cookies</p>
                <p className="text-xs text-muted-foreground">Enable personalized ads and ad campaign measurement.</p>
              </div>
              <button
                onClick={() => setCustom(c => ({ ...c, advertising: !c.advertising }))}
                className={`flex h-6 w-11 items-center rounded-full transition-colors ${custom.advertising ? "bg-accent" : "bg-gray-300 dark:bg-gray-600"}`}
                role="switch"
                aria-checked={custom.advertising}
              >
                <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${custom.advertising ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {/* Preference */}
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Preference Cookies</p>
                <p className="text-xs text-muted-foreground">Remember your language, theme, and display settings.</p>
              </div>
              <button
                onClick={() => setCustom(c => ({ ...c, preference: !c.preference }))}
                className={`flex h-6 w-11 items-center rounded-full transition-colors ${custom.preference ? "bg-accent" : "bg-gray-300 dark:bg-gray-600"}`}
                role="switch"
                aria-checked={custom.preference}
              >
                <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${custom.preference ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleSaveCustom}
                className="rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-2 text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Save My Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
