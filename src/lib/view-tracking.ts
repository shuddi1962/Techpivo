"use client"

export function getSessionId(): string {
  try {
    let id = sessionStorage.getItem("tp_session_id")
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || `s-${Date.now()}-${Math.random().toString(36).slice(2)}`
      sessionStorage.setItem("tp_session_id", id)
    }
    return id
  } catch {
    return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

export function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  let device = "Desktop"
  if (/iPad|Tablet/i.test(ua)) device = "Tablet"
  else if (/Mobi|Android|iPhone|iPod/i.test(ua)) device = "Mobile"

  let browser = "Other"
  if (/Edg\//i.test(ua)) browser = "Edge"
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera"
  else if (/Chrome\//i.test(ua)) browser = "Chrome"
  else if (/Firefox\//i.test(ua)) browser = "Firefox"
  else if (/Safari\//i.test(ua)) browser = "Safari"

  let os = "Other"
  if (/Windows/i.test(ua)) os = "Windows"
  else if (/Android/i.test(ua)) os = "Android"
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS"
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS"
  else if (/Linux/i.test(ua)) os = "Linux"

  return { device, browser, os }
}

export function detectCountry(): string | null {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!timeZone || timeZone === "UTC") return null
    const parts = timeZone.split("/")
    const region = parts[0] || ""
    if (!region || region === "Etc") return null
    const countryMap: Record<string, string> = {
      "America": "US", "Europe": "GB", "Asia": "IN", "Africa": "ZA",
      "Australia": "AU", "Pacific": "NZ", "Atlantic": "US",
    }
    if (parts.length === 2) {
      return parts[1]?.length === 2 ? parts[1] : countryMap[region] || region
    }
    return countryMap[region] || null
  } catch {
    return null
  }
}

export function trackView(body: Record<string, string>) {
  const ua = navigator.userAgent
  const { device, browser, os } = parseUserAgent(ua)
  const country = detectCountry()

  const payload: Record<string, string | null> = {
    ...body,
    sessionId: getSessionId(),
    device,
    browser,
    os,
    country: country || null,
  }

  fetch("/api/increment-views", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch((err) => console.error("View tracking error:", err))
}
