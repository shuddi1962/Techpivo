"use client"

import Link from "next/link"
import { socialIcons, defaultPlatforms, defaultSocialUrls } from "@/components/layout/social-icons"

export function TopBar({ socialUrls = {} }: { socialUrls?: Record<string, string> }) {
  const now = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
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
          <Link href="/community/events">Events</Link>
          <Link href="/newsletter">Newsletter</Link>
          <span className="top-divider" />
          <Link href="/write-for-us">Write for Us</Link>
        </div>
        <div className="top-bar-right">
          <div className="top-social" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {defaultPlatforms.map((platform) => {
              const href = socialUrls[platform] || defaultSocialUrls[platform]
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Subscribe
          </Link>
        </div>
      </div>
    </div>
  )
}
