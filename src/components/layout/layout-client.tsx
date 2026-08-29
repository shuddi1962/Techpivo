"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { TopBar } from "@/components/layout/TopBar"
import { Header } from "@/components/layout/Header"
import { MainNav } from "@/components/layout/MainNav"
import { Footer } from "@/components/layout/Footer"

export function LayoutClient({
  children,
  categories,
  socialUrls,
  recentPosts,
}: {
  children: React.ReactNode
  categories: any[]
  socialUrls: Record<string, string>
  recentPosts: any[]
}) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith("/admin")
  const isHome = pathname === "/"
  const noLayout = isAdmin || isHome || pathname === "/login" || pathname === "/signup" || pathname?.startsWith("/auth/")
  const isAccount = pathname === "/account" || pathname?.startsWith("/account/")

  if (noLayout) {
    return (
      <>
        {children}
        <BackToTop />
      </>
    )
  }

  return (
    <>
      <TopBar socialUrls={socialUrls} />
      <Header socialUrls={socialUrls} />
      <MainNav categories={categories} />
      <main>{children}</main>
      {!isAccount && <Footer categories={categories} recentPosts={recentPosts} socialUrls={socialUrls} />}
      <BackToTop />
    </>
  )
}

function BackToTop() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const fn = () => setVisible(window.scrollY > 400)
    window.addEventListener("scroll", fn)
    return () => window.removeEventListener("scroll", fn)
  }, [])
  if (!visible) return null
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="back-to-top"
      aria-label="Back to top"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
    </button>
  )
}
