"use client"

import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState("")
  const [loginOpen, setLoginOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", fn)
    return () => window.removeEventListener("scroll", fn)
  }, [])

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  return (
    <>
      <header className={`site-header${scrolled ? " scrolled" : ""}`}>
        <div className="header-inner">
          <Link href="/" className="logo">
            <span className="logo-text">Blizine</span>
            <span className="logo-tld">.com</span>
          </Link>

          <div className="header-ad-zone">
            <span className="ad-label">Advertisement</span>
            <div className="header-ad-inner">
              <span>Upgrade to Blizine Pro</span>
              <Link href="/pro" className="header-ad-cta">Get Pro</Link>
            </div>
          </div>

          <div className="header-controls">
            <button className="icon-btn" onClick={() => setSearchOpen(s => !s)} aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
            {mounted && (
              <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
                {theme === "dark" ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                )}
              </button>
            )}
            <button className="login-btn" onClick={() => setLoginOpen(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
              Sign In
            </button>
          </div>
        </div>

        <div className={`search-dropdown${searchOpen ? " open" : ""}`}>
          <div className="search-inner">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search articles..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && router.push(`/search?q=${encodeURIComponent(searchQ)}`)}
              className="search-input"
            />
            <button className="search-close-btn" onClick={() => { setSearchOpen(false); setSearchQ("") }}>✕</button>
          </div>
        </div>
      </header>

      {loginOpen && (
        <div className="modal-backdrop" onClick={() => setLoginOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setLoginOpen(false)}>✕</button>
            <div className="modal-logo" style={{ marginBottom: 16 }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: "var(--text)" }}>Blizine</span>
            </div>
            <h2 className="modal-title">Welcome Back</h2>
            <p className="modal-sub">Sign in to save articles, join discussions, and get a personalised feed.</p>
            <a href="#" className="oauth-btn">
              <span className="oauth-icon">G</span>
              Continue with Google
            </a>
            <a href="#" className="oauth-btn">
              <span className="oauth-icon">⌥</span>
              Continue with GitHub
            </a>
            <div className="modal-or">or</div>
            <input type="email" placeholder="Email address" className="modal-input" />
            <input type="password" placeholder="Password" className="modal-input" />
            <button className="modal-submit">Sign In</button>
            <p className="modal-footer-text">
              Don&apos;t have an account? <a href="#">Sign up free</a>
            </p>
          </div>
        </div>
      )}
    </>
  )
}
