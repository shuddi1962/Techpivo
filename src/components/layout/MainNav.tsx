"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"

const COMMUNITY_LINKS = [
  { href: "/community", label: "Discover" },
  { href: "/community/questions", label: "Questions" },
  { href: "/community/forum", label: "Discussions" },
  { href: "/community/topics", label: "Topics" },
  { href: "/community/polls", label: "Polls" },
  { href: "/community/quiz", label: "Quizzes" },
  { href: "/community/events", label: "Events" },
  { href: "/community/leaderboard", label: "Leaderboard" },
  { href: "/community/search", label: "Search" },
  { href: "/community/create", label: "Create" },
]

function isCommunityPath(pathname: string): boolean {
  return pathname.startsWith("/community") || pathname.startsWith("/answers") || pathname.startsWith("/u/")
}

export function MainNav({ categories }: { categories: any[] }) {
  const pathname = usePathname()
  const [sticky, setSticky] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const communityMode = isCommunityPath(pathname)

  useEffect(() => {
    const fn = () => setSticky(window.scrollY > 100)
    window.addEventListener("scroll", fn)
    return () => window.removeEventListener("scroll", fn)
  }, [])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  return (
    <>
      <div className={`main-nav${sticky ? " nav-sticky" : ""}`}>
        <div className="nav-inner">
          <div className="nav-links">
            {communityMode ? (
              <>
                {COMMUNITY_LINKS.map(link => (
                  <Link key={link.href} href={link.href} className={`nav-link${pathname === link.href ? " nav-link-active" : ""}`}>
                    {link.label}
                  </Link>
                ))}
              </>
            ) : (
              <>
                <Link href="/" className="nav-link nav-home">Home</Link>
                {categories.map((cat: any) => (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    className="nav-link"
                    style={{ "--hover-color": cat.color || "hsl(var(--accent))" } as React.CSSProperties}
                  >
                    {cat.name}
                  </Link>
                ))}
              </>
            )}
          </div>
          <div className="nav-right">
            {!communityMode && (
              <div className="live-dot-wrap">
                <span className="live-pulse" />
                <span className="live-text">LIVE</span>
              </div>
            )}
            <button className="nav-mobile-toggle" onClick={() => setMobileOpen(true)} aria-label="Menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-menu">
          <button className="mobile-menu-close" onClick={() => setMobileOpen(false)}>&times;</button>
          <div style={{ padding: "8px 0" }}>
            {communityMode ? (
              <>
                {COMMUNITY_LINKS.map(link => (
                  <Link key={link.href} href={link.href} className="mobile-link" onClick={() => setMobileOpen(false)}>{link.label}</Link>
                ))}
              </>
            ) : (
              <>
                <Link href="/" className="mobile-link" onClick={() => setMobileOpen(false)}>Home</Link>
                {categories.map((cat: any) => (
                  <Link key={cat.id} href={`/category/${cat.slug}`} className="mobile-link" onClick={() => setMobileOpen(false)}>{cat.name}</Link>
                ))}
              </>
            )}
            {!communityMode && (
              <>
                <Link href="/community/forum" className="mobile-link" onClick={() => setMobileOpen(false)}>Forum</Link>
                <Link href="/community/quiz" className="mobile-link" onClick={() => setMobileOpen(false)}>Quizzes</Link>
                <Link href="/community/polls" className="mobile-link" onClick={() => setMobileOpen(false)}>Polls</Link>
                <Link href="/community/leaderboard" className="mobile-link" onClick={() => setMobileOpen(false)}>Leaderboard</Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
