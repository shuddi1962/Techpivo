"use client"

import Link from "next/link"
import { Search, Menu, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { SITE_NAME } from "@/lib/constants"
import { useEffect, useState } from "react"

export function Header() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  return (
    <header className="border-b bg-background">
      <div className="container flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/" className="flex items-center gap-1">
            <span className="text-2xl font-black tracking-tight">
              BLIZ<span className="text-brand-indigo">9</span>INE
            </span>
          </Link>
        </div>

        <div className="hidden lg:flex items-center gap-6 text-sm font-medium">
          <Link href="/category/tech-news" className="hover:text-brand-indigo transition-colors">Tech News</Link>
          <Link href="/category/web-development" className="hover:text-brand-indigo transition-colors">Web Dev</Link>
          <Link href="/category/programming" className="hover:text-brand-indigo transition-colors">Programming</Link>
          <Link href="/category/cybersecurity" className="hover:text-brand-indigo transition-colors">Security</Link>
          <Link href="/category/ai-automation" className="hover:text-brand-indigo transition-colors">AI</Link>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/search">
            <Button variant="ghost" size="icon">
              <Search className="h-5 w-5" />
            </Button>
          </Link>
          {mounted && (
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
