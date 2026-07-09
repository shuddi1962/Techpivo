"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { defaultSocialUrls } from "@/components/layout/social-icons"

const platforms = [
  {
    id: "twitter", name: "Twitter / X",
    icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    color: "#555555",
    label: "Follow",
    defaultHref: "#",
  },
  {
    id: "facebook", name: "Facebook",
    icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    color: "#1877F2",
    label: "Like",
    defaultHref: "#",
  },
  {
    id: "instagram", name: "Instagram",
    icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>,
    color: "#E4405F",
    label: "Follow",
    defaultHref: "#",
  },
  {
    id: "reddit", name: "Reddit",
    icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.51 9.08a1.83 1.83 0 0 1 1.83 1.83c0 .68-.37 1.27-.92 1.58.03.13.04.27.04.41 0 2.78-2.98 5.03-6.66 5.03s-6.66-2.25-6.66-5.03c0-.14.02-.28.04-.41a1.83 1.83 0 0 1-.92-1.58 1.83 1.83 0 0 1 3.63-.6c1-.7 2.35-1.14 3.85-1.2l.66-3.1a.38.38 0 0 1 .45-.31l2.17.47a1.29 1.29 0 0 1 1.2-.88 1.3 1.3 0 0 1 1.29 1.29 1.3 1.3 0 0 1-1.3 1.3c-.6 0-1.1-.4-1.24-.95l-1.92-.42-.6 2.82c1.52.06 2.88.5 3.89 1.2a1.83 1.83 0 0 1 1.62-.92zm-5.5 3.23c-.7 0-1.43.28-2 .73-.3.24-.35.7-.1 1.01.24.31.7.36 1.01.1.37-.29.78-.44 1.19-.44.7 0 1.1.3 1.2.44.3.25.76.2 1.01-.1.24-.31.2-.77-.1-1.01-.6-.45-1.3-.73-2.21-.73zm-1.83 2.2c-.49.54-.7 1.24-.46 1.93.36 1.03 1.63 1.7 2.98 1.7s2.62-.67 2.98-1.7c.24-.69.03-1.4-.46-1.93-.48-.52-1.26-.86-2.52-.86s-2.04.34-2.52.86zm6.38.48a1.03 1.03 0 1 0 0 2.06 1.03 1.03 0 1 0 0-2.06zm-10.88 0a1.03 1.03 0 1 0 0 2.06 1.03 1.03 0 1 0 0-2.06z"/></svg>,
    color: "#FF4500",
    label: "Join",
    defaultHref: "#",
  },
  {
    id: "linkedin", name: "LinkedIn",
    icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
    color: "#0A66C2",
    label: "Network",
    defaultHref: "#",
  },
]

export function SocialWidget() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [socialUrls, setSocialUrls] = useState<Record<string, string>>({})
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const supabase = createClient()
    supabase.from("social_accounts").select("platform, credentials").then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {}
        data.forEach((a) => {
          const creds = a.credentials as Record<string, string> | undefined
          if (creds?.follow_url) map[a.platform] = creds.follow_url
        })
        setSocialUrls(map)
      }
    })
  }, [])
  const isDark = mounted && (theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches))

  return (
    <div className="sidebar-card">
      <div className="sidebar-card-header">
        <span className="sidebar-card-icon">◈</span>
        <span className="sidebar-card-title">Follow Us</span>
      </div>
      {platforms.map((p) => {
        const href = socialUrls[p.id] || defaultSocialUrls[p.id] || p.defaultHref
        return (
          <div key={p.id} className="social-row">
            <div className="social-icon-wrap" style={{ background: p.color }}>
              {p.icon}
            </div>
            <div className="social-info">
              <div className="social-name">{p.name}</div>
            </div>
            <Link href={href} className="social-btn" style={{ border: `1px solid ${isDark ? "white" : p.color}`, color: isDark ? "white" : p.color }}>
              {p.label}
            </Link>
          </div>
        )
      })}
    </div>
  )
}
