"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

const headerSocials = [
  { id: "twitter", label: "Twitter / X", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  { id: "facebook", label: "Facebook", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
  { id: "instagram", label: "Instagram", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg> },
  { id: "reddit", label: "Reddit", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.51 9.08a1.83 1.83 0 0 1 1.83 1.83c0 .68-.37 1.27-.92 1.58.03.13.04.27.04.41 0 2.78-2.98 5.03-6.66 5.03s-6.66-2.25-6.66-5.03c0-.14.02-.28.04-.41a1.83 1.83 0 0 1-.92-1.58 1.83 1.83 0 0 1 3.63-.6c1-.7 2.35-1.14 3.85-1.2l.66-3.1a.38.38 0 0 1 .45-.31l2.17.47a1.29 1.29 0 0 1 1.2-.88 1.3 1.3 0 0 1 1.29 1.29 1.3 1.3 0 0 1-1.3 1.3c-.6 0-1.1-.4-1.24-.95l-1.92-.42-.6 2.82c1.52.06 2.88.5 3.89 1.2a1.83 1.83 0 0 1 1.62-.92zm-5.5 3.23c-.7 0-1.43.28-2 .73-.3.24-.35.7-.1 1.01.24.31.7.36 1.01.1.37-.29.78-.44 1.19-.44.7 0 1.1.3 1.2.44.3.25.76.2 1.01-.1.24-.31.2-.77-.1-1.01-.6-.45-1.3-.73-2.21-.73zm-1.83 2.2c-.49.54-.7 1.24-.46 1.93.36 1.03 1.63 1.7 2.98 1.7s2.62-.67 2.98-1.7c.24-.69.03-1.4-.46-1.93-.48-.52-1.26-.86-2.52-.86s-2.04.34-2.52.86zm6.38.48a1.03 1.03 0 1 0 0 2.06 1.03 1.03 0 1 0 0-2.06zm-10.88 0a1.03 1.03 0 1 0 0 2.06 1.03 1.03 0 1 0 0-2.06z"/></svg> },
  { id: "linkedin", label: "LinkedIn", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
]

export function Header() {
  const [searchQ, setSearchQ] = useState("")
  const [loginOpen, setLoginOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [socialUrls, setSocialUrls] = useState<Record<string, string>>({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mobileSearch, setMobileSearch] = useState("")
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const supabase = createClient()

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).single()
    setProfileName(data?.full_name || null)
  }

  useEffect(() => {
    setMounted(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
    })
    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", fn)
    return () => window.removeEventListener("scroll", fn)
  }, [])

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

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [drawerOpen])

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (mobileSearch.trim()) {
      setDrawerOpen(false)
      router.push(`/search?q=${encodeURIComponent(mobileSearch)}`)
    }
  }

  return (
    <>
      <header className={`site-header${scrolled ? " scrolled" : ""}`}>
        <div className="header-inner">
          {/* MOBILE: hamburger on left */}
          <button className="header-hamburger" onClick={() => setDrawerOpen(true)} aria-label="Menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>

          {/* Logo — always visible */}
          <Link href="/" className="logo">
            <Image src="/logo.svg" alt="Techpivo" className="logo-img" width={340} height={68} priority />
            <span className="logo-text">Techpivo</span>
          </Link>

          {/* Search — desktop only */}
          <div className="header-search-box">
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && router.push(`/search?q=${encodeURIComponent(searchQ)}`)}
              className="search-box-input"
            />
            <button className="search-box-btn" onClick={() => searchQ.trim() && router.push(`/search?q=${encodeURIComponent(searchQ)}`)} aria-label="Search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
          </div>

          {/* Right side controls */}
          <div className="header-controls">
            {/* Theme toggle — always visible */}
            {mounted && (
              <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
                {theme === "dark" ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                )}
              </button>
            )}

            {/* Desktop nav links — text only */}
            <Link href="/tools" className="header-nav-link"><span>Tools</span></Link>
            <Link href="/community" className="header-nav-link"><span>Community</span></Link>
            <div className="header-dropdown">
              <Link href="/community/events" className="header-nav-link"><span>Events</span><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ marginLeft: 3, opacity: 0.7 }}><polyline points="6 9 12 15 18 9"/></svg></Link>
              <div className="header-dropdown-menu">
                <Link href="/community/events"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>Events</Link>
                <Link href="/community/forum"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Forum</Link>
                <Link href="/community/quiz"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Quizzes</Link>
                <Link href="/community/polls"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>Polls</Link>
                <Link href="/community/learning-paths"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>Learning Paths</Link>
                <Link href="/community/leaderboard"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>Leaderboard</Link>
              </div>
            </div>
            <Link href="/marketplace" className="header-nav-link"><span>Shop</span></Link>

            {/* Socials — desktop only, before Sign In */}
            <div className="header-socials">
              {headerSocials.map((s) => {
                const href = socialUrls[s.id]
                if (!href) return null
                return (
                  <a key={s.id} href={href} target="_blank" rel="noopener noreferrer" className="icon-btn" aria-label={s.label}>
                    {s.icon}
                  </a>
                )
              })}
            </div>

            {/* Account / Sign In — always visible */}
            {user ? (
              <Link href="/account" className="login-btn header-account-btn">
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="" className="header-avatar" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                )}
                <span className="header-user-name">{profileName || user.user_metadata?.full_name || user.email?.split("@")[0] || "Account"}</span>
              </Link>
            ) : (
              <button className="login-btn header-signin-btn" onClick={() => setLoginOpen(true)}>
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="header-mobile-drawer" onClick={() => setDrawerOpen(false)}>
          <div className="mobile-drawer-panel" onClick={e => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <Link href="/" className="mobile-drawer-logo" onClick={() => setDrawerOpen(false)}>
                <Image src="/logo.svg" alt="Techpivo" width={140} height={28} />
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: "var(--text)", marginLeft: 4 }}>Techpivo</span>
              </Link>
              <button className="mobile-drawer-close" onClick={() => setDrawerOpen(false)}>&times;</button>
            </div>
            <form className="mobile-drawer-search" onSubmit={handleMobileSearch}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, color: "var(--muted2)" }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                type="text"
                placeholder="Search articles..."
                value={mobileSearch}
                onChange={e => setMobileSearch(e.target.value)}
              />
            </form>
            <div className="mobile-drawer-nav">
              <div className="mobile-drawer-section">Navigation</div>
              <Link href="/" className="mobile-drawer-link" onClick={() => setDrawerOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                Home
              </Link>
              <Link href="/tools" className="mobile-drawer-link" onClick={() => setDrawerOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                Tools
              </Link>
              <Link href="/community" className="mobile-drawer-link" onClick={() => setDrawerOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Community
              </Link>
              <Link href="/community/events" className="mobile-drawer-link" onClick={() => setDrawerOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                Events
              </Link>
              <Link href="/marketplace" className="mobile-drawer-link" onClick={() => setDrawerOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                Shop
              </Link>
              <Link href="/newsletter" className="mobile-drawer-link" onClick={() => setDrawerOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                Newsletter
              </Link>
              <div className="mobile-drawer-divider" />
              <div className="mobile-drawer-section">Community</div>
              <Link href="/community/forum" className="mobile-drawer-link" onClick={() => setDrawerOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Forum
              </Link>
              <Link href="/community/quiz" className="mobile-drawer-link" onClick={() => setDrawerOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Quizzes
              </Link>
              <Link href="/community/polls" className="mobile-drawer-link" onClick={() => setDrawerOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                Polls
              </Link>
              <Link href="/community/leaderboard" className="mobile-drawer-link" onClick={() => setDrawerOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                Leaderboard
              </Link>
              <Link href="/community/learning-paths" className="mobile-drawer-link" onClick={() => setDrawerOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                Learning Paths
              </Link>
              <div className="mobile-drawer-divider" />
              <div className="mobile-drawer-section">Account</div>
              {user ? (
                <>
                  <Link href="/account" className="mobile-drawer-link" onClick={() => setDrawerOpen(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    My Account
                  </Link>
                  <Link href="/account/security" className="mobile-drawer-link" onClick={() => setDrawerOpen(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Security
                  </Link>
                  <Link href="/account/bookmarks" className="mobile-drawer-link" onClick={() => setDrawerOpen(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                    Bookmarks
                  </Link>
                </>
              ) : (
                <button className="mobile-drawer-link" onClick={() => { setDrawerOpen(false); setLoginOpen(true) }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
                  Sign In
                </button>
              )}
              <div className="mobile-drawer-divider" />
              <div className="mobile-drawer-section">Info</div>
              <Link href="/about" className="mobile-drawer-link" onClick={() => setDrawerOpen(false)}>About</Link>
              <Link href="/contact" className="mobile-drawer-link" onClick={() => setDrawerOpen(false)}>Contact</Link>
              <Link href="/advertise" className="mobile-drawer-link" onClick={() => setDrawerOpen(false)}>Advertise</Link>
              <Link href="/write-for-us" className="mobile-drawer-link" onClick={() => setDrawerOpen(false)}>Write For Us</Link>
            </div>
            <div className="mobile-drawer-footer">
              <div className="mobile-drawer-socials">
                {headerSocials.map((s) => {
                  const href = socialUrls[s.id]
                  if (!href) return null
                  return (
                    <a key={s.id} href={href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                      {s.icon}
                    </a>
                  )
                })}
              </div>
              {user ? (
                <button className="login-btn" onClick={async () => { await supabase.auth.signOut(); setDrawerOpen(false); router.refresh() }}>
                  Sign Out
                </button>
              ) : (
                <button className="login-btn" onClick={() => { setDrawerOpen(false); setLoginOpen(true) }}>
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {loginOpen && (
        <div className="modal-backdrop" onClick={() => setLoginOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setLoginOpen(false)}>&times;</button>
            <div className="modal-logo" style={{ marginBottom: 16 }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: "var(--text)" }}>Techpivo</span>
            </div>
            <h2 className="modal-title">Welcome Back</h2>
            <p className="modal-sub">Sign in to save articles, join discussions, and get a personalised feed.</p>
            <a href="#" className="oauth-btn" onClick={(e) => { e.preventDefault(); supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } }) }}>
              <span className="oauth-icon">G</span>
              Continue with Google
            </a>
            <a href="#" className="oauth-btn" onClick={(e) => { e.preventDefault(); supabase.auth.signInWithOAuth({ provider: "github", options: { redirectTo: `${location.origin}/auth/callback` } }) }}>
              <span className="oauth-icon">&#8984;</span>
              Continue with GitHub
            </a>
          <div className="modal-or">or</div>
            <form onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const email = (form.querySelector('[name="email"]') as HTMLInputElement).value; const password = (form.querySelector('[name="password"]') as HTMLInputElement).value; const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) { alert(error.message) } else { setLoginOpen(false); router.refresh() } }}>
              <input name="email" type="email" placeholder="Email address" className="modal-input" required />
              <input name="password" type="password" placeholder="Password" className="modal-input" required />
              <button type="submit" className="modal-submit">Sign In</button>
            </form>
            <p className="modal-footer-text">
              Don&apos;t have an account? <a href="/signup" onClick={(e) => { e.preventDefault(); setLoginOpen(false); router.push("/signup") }}>Sign up free</a>
            </p>
          </div>
        </div>
      )}
    </>
  )
}
