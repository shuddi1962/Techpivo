"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

const headerSocials = [
  { id: "twitter", label: "Twitter / X", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  { id: "youtube_community", label: "YouTube", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
  { id: "telegram", label: "Telegram", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg> },
  { id: "facebook", label: "Facebook", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
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
          <Link href="/" className="logo">
            <img src="/logo.svg?v=6" alt="Techpivo" className="logo-img" width="340" height="68" />
          </Link>

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

          <div className="header-controls">
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
            {mounted && (
              <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
                {theme === "dark" ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                )}
              </button>
            )}
            {/* Desktop-only nav buttons — hidden on mobile via CSS class */}
            <Link href="/tools" className="login-btn header-nav-link" style={{ gap: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              <span className="login-btn-text">Tools</span>
            </Link>
            <Link href="/community" className="login-btn header-nav-link" style={{ gap: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span className="login-btn-text">Community</span>
            </Link>
            <Link href="/community/events" className="login-btn header-nav-link" style={{ gap: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              <span className="login-btn-text">Events</span>
            </Link>
            <Link href="/marketplace" className="login-btn header-nav-link" style={{ gap: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              <span className="login-btn-text">Shop</span>
            </Link>
            {/* Account — always visible */}
            {user ? (
              <Link href="/account" className="login-btn" style={{ gap: 8, textDecoration: "none" }}>
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="" className="header-avatar" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                )}
                <span className="header-user-name">{profileName || user.user_metadata?.full_name || user.email?.split("@")[0] || "Account"}</span>
              </Link>
            ) : (
              <button className="login-btn" onClick={() => setLoginOpen(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
                <span className="login-btn-text">Sign In</span>
              </button>
            )}
            {/* Hamburger — always last, always visible on mobile */}
            <button className="icon-btn header-hamburger" onClick={() => setDrawerOpen(true)} aria-label="Menu">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        </div>
      </header>

      {drawerOpen && (
        <div className="header-mobile-drawer" onClick={() => setDrawerOpen(false)}>
          <div className="mobile-drawer-panel" onClick={e => e.stopPropagation()}>
            {/* Drawer header with logo */}
            <div className="mobile-drawer-header">
              <Link href="/" className="mobile-drawer-logo" onClick={() => setDrawerOpen(false)}>
                <img src="/logo.svg?v=6" alt="Techpivo" style={{ height: 28, width: "auto" }} />
              </Link>
              <button className="mobile-drawer-close" onClick={() => setDrawerOpen(false)}>&times;</button>
            </div>
            {/* Search */}
            <form className="mobile-drawer-search" onSubmit={handleMobileSearch}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, color: "var(--muted2)" }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                type="text"
                placeholder="Search articles..."
                value={mobileSearch}
                onChange={e => setMobileSearch(e.target.value)}
              />
            </form>
            {/* Navigation */}
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
