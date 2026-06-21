"use client"

import { useEffect, useState } from "react"

const CONSENT_KEY = "techpivo_consent"

type ConsentChoice = "accepted" | "rejected" | null

function getStoredConsent(): ConsentChoice {
  if (typeof window === "undefined") return null
  return localStorage.getItem(CONSENT_KEY) as ConsentChoice
}

function applyConsent(granted: boolean) {
  const w = window as any
  w.dataLayer = w.dataLayer || []
  function gtag(...args: unknown[]) { w.dataLayer.push(args) }
  gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: granted ? "granted" : "denied",
    ad_user_data: granted ? "granted" : "denied",
    ad_personalization: granted ? "granted" : "denied",
    personalization_storage: granted ? "granted" : "denied",
  })
}

export function CookieConsentBanner() {
  const [choice, setChoice] = useState<ConsentChoice>(null)

  useEffect(() => {
    setChoice(getStoredConsent())
  }, [])

  function handleAccept() {
    localStorage.setItem(CONSENT_KEY, "accepted")
    setChoice("accepted")
    applyConsent(true)
  }

  function handleReject() {
    localStorage.setItem(CONSENT_KEY, "rejected")
    setChoice("rejected")
    applyConsent(false)
  }

  if (choice !== null) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-4 shadow-lg">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 sm:flex-row">
        <p className="flex-1 text-sm text-muted-foreground">
          We use cookies and similar technologies to improve your experience, analyze traffic, and
          personalize content. By clicking &ldquo;Accept All&rdquo;, you consent to our use of cookies.
          See our{" "}
          <a href="/cookies-policy" className="text-accent underline hover:no-underline">
            Cookies Policy
          </a>{" "}
          for details.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={handleReject}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Reject All
          </button>
          <button
            onClick={handleAccept}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  )
}
