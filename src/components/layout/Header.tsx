"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export function Header() {
  const [searchQ, setSearchQ] = useState("")
  const [loginOpen, setLoginOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [profileName, setProfileName] = useState<string | null>(null)
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
  }, [])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", fn)
    return () => window.removeEventListener("scroll", fn)
  }, [])

  return (
    <>
      <header className={`site-header${scrolled ? " scrolled" : ""}`}>
        <div className="header-inner">
          <Link href="/" className="logo">
            <img src="/logo.svg?v=6" alt="Techpivo" className="logo-img" width="280" height="56" />
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
            {mounted && (
              <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
                {theme === "dark" ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                )}
              </button>
            )}
            <Link href="/marketplace" className="login-btn" style={{ gap: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              Shop
            </Link>
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
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {loginOpen && (
        <div className="modal-backdrop" onClick={() => setLoginOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setLoginOpen(false)}>✕</button>
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
              <span className="oauth-icon">⌥</span>
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
