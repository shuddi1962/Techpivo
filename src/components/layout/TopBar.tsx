"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

const socialIcons: Record<string, JSX.Element> = {
  twitter: <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  youtube_community: <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  telegram: <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>,
  facebook: <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
}

const defaultPlatforms = ["twitter", "youtube_community", "telegram", "facebook"]

export function TopBar() {
  const now = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
  const [socialUrls, setSocialUrls] = useState<Record<string, string>>({})
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
  return (
    <div className="top-bar">
      <div className="container">
        <div className="top-bar-left">
          <span className="top-date">{now}</span>
          <span className="top-divider" />
          <span className="top-divider" />
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/disclaimer">Disclaimer</Link>
          <Link href="/advertise">Advertise</Link>
          <Link href="/newsletter">Newsletter</Link>
          <span className="top-divider" />
          <Link href="/write-for-us">Write for Us</Link>
        </div>
        <div className="top-bar-right">
          <div className="top-social" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {defaultPlatforms.map((platform) => {
              const href = socialUrls[platform]
              if (!href) return null
              return (
                <a key={platform} href={href} target="_blank" rel="noopener noreferrer" aria-label={platform} style={{ display: "flex", alignItems: "center", lineHeight: 0 }}>
                  {socialIcons[platform]}
                </a>
              )
            })}
          </div>
          <span className="top-divider" />
          <Link href="/newsletter" className="top-subscribe-btn">
            Subscribe Free
          </Link>
        </div>
      </div>
    </div>
  )
}
