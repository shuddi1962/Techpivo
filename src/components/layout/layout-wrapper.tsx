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
  const noLayout = isAdmin || isHome || pathname === "/login" || pathname === "/signup" || pathname?.startsWith("/auth/")
  const isAccount = pathname === "/account" || pathname?.startsWith("/account/")
  const [categories, setCategories] = useState<any[]>([])
  const [socialUrls, setSocialUrls] = useState<Record<string, string>>({})
  const [recentPosts, setRecentPosts] = useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from("posts").select("category_id, subcategory_id").eq("status", "published"),
      supabase.from("categories").select("*, subcategories(*)").eq("is_active", true).order("name"),
      supabase.from("posts").select("id,title,slug,featured_image").eq("status","published").order("published_at",{ascending:false}).limit(6),
      supabase.from("site_settings").select("key, value").like("key", "social_%"),
    ]).then(([postsRes, catsRes, recentRes, settingsRes]) => {
      const catIds = new Set((postsRes.data || []).map((p: any) => p.category_id).filter(Boolean) as string[])
      const subcatIds = new Set((postsRes.data || []).map((p: any) => p.subcategory_id).filter(Boolean) as string[])
      if (catsRes.data) {
        const filtered = catsRes.data
          .filter((cat: any) => catIds.has(cat.id))
          .map((cat: any) => ({
            ...cat,
            subcategories: (cat.subcategories || []).filter((sub: any) => subcatIds.has(sub.id) && sub.is_active !== false),
          }))
        setCategories(filtered)
      }
      if (recentRes.data) setRecentPosts(recentRes.data)
      if (settingsRes.data) {
        const map: Record<string, string> = {}
        settingsRes.data.forEach((row: any) => {
          const platform = row.key.replace("social_", "")
          const val = typeof row.value === "string" ? row.value : (row.value as any)?.toString?.() || ""
          if (val) map[platform] = val
        })
        setSocialUrls(map)
      }
    })
  }, [])

  if (noLayout) {
    return <>{children}<BackToTop /></>
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
