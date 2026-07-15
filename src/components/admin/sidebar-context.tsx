"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { useMediaQuery } from "@/hooks/use-media-query"

interface SidebarContextType {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  toggleCollapsed: () => void
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
  toggleMobile: () => void
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
  toggleCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
  toggleMobile: () => {},
})

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 1024px)")

  useEffect(() => {
    if (isDesktop) setMobileOpen(false)
  }, [isDesktop])

  const toggleCollapsed = useCallback(() => setCollapsed((p) => !p), [])
  const toggleMobile = useCallback(() => setMobileOpen((p) => !p), [])

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, toggleCollapsed, mobileOpen, setMobileOpen, toggleMobile }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
