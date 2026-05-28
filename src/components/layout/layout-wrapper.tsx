"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { TopBar } from "@/components/layout/TopBar"
import { Header } from "@/components/layout/Header"
import { MainNav } from "@/components/layout/MainNav"
import { BreakingTicker } from "@/components/home/BreakingTicker"
import { Footer } from "@/components/layout/Footer"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith("/admin")
  const isHome = pathname === "/"
  const noLayout = isAdmin || isHome || pathname === "/login" || pathname === "/signup" || pathname === "/account" || pathname?.startsWith("/auth/")
  const [categories, setCategories] = useState<any[]>([])

  const [recentPosts, setRecentPosts] = useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.from("categories").select("*, subcategories(*)").order("name").then(({ data }) => {
      if (data) setCategories(data)
    })
    supabase.from("posts").select("id,title,slug,featured_image").eq("status","published").order("published_at",{ascending:false}).limit(6).then(({ data }) => {
      if (data) setRecentPosts(data)
    })
  }, [])

  if (noLayout) {
    return <>{children}<BackToTop /></>
  }

  return (
    <>
      <TopBar />
      <Header />
      <MainNav categories={categories} />
      <main>{children}</main>
      <Footer categories={categories} recentPosts={recentPosts} />
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
