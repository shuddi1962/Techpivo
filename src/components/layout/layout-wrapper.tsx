"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { BreakingNews } from "./breaking-news"
import { Header } from "./header"
import { Nav } from "./nav"
import { Footer } from "./footer"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith("/admin")
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.from("categories").select("*, subcategories(*)").order("name").then(({ data }) => {
      if (data) setCategories(data)
    })
  }, [])

  if (isAdmin) {
    return <>{children}</>
  }

  return (
    <>
      <BreakingNews />
      <Header />
      <Nav categories={categories} />
      <main>{children}</main>
      <Footer />
    </>
  )
}
