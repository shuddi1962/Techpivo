export type ConsentCategory = "necessary" | "functional" | "analytics" | "marketing"

export interface ConsentPreferences {
  necessary: true
  functional: boolean
  analytics: boolean
  marketing: boolean
}

const STORAGE_KEY = "techpivo_consent"

export const defaultConsent: ConsentPreferences = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
}

function getGoogleConsent(): ConsentPreferences | null {
  if (typeof window === "undefined") return null
  try {
    const dataLayer = (window as any).dataLayer || []
    let adStorage: string | null = null
    for (const entry of dataLayer) {
      if (entry?.[0] === "consent" && entry?.[1] === "update") {
        adStorage = entry[2]?.ad_storage ?? adStorage
      }
    }
    if (!adStorage) {
      for (const entry of dataLayer) {
        if (entry?.[0] === "consent" && entry?.[1] === "default") {
          adStorage = entry[2]?.ad_storage ?? adStorage
        }
      }
    }
    if (!adStorage) return null
    return {
      necessary: true,
      functional: true,
      analytics: adStorage !== "denied",
      marketing: adStorage !== "denied",
    }
  } catch {
    return null
  }
}

export function getConsent(): ConsentPreferences | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveConsent(prefs: Partial<ConsentPreferences>): ConsentPreferences {
  const current = getConsent() || defaultConsent
  const merged: ConsentPreferences = { ...defaultConsent, ...current, ...prefs, necessary: true }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  return merged
}

export function hasConsentFor(category: ConsentCategory): boolean {
  if (category === "necessary") return true
  const googleConsent = getGoogleConsent()
  if (googleConsent) {
    if (category === "marketing" || category === "analytics") {
      return googleConsent.marketing
    }
    return !!googleConsent[category]
  }
  const prefs = getConsent()
  if (!prefs) return false
  return !!prefs[category]
}

export function clearConsent(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
}
