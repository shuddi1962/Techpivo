"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const TIMEOUT_MS = 30 * 60 * 1000
const WARNING_MS = 60 * 1000

export function SessionTimeout() {
  const router = useRouter()
  const supabase = createClient()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [remaining, setRemaining] = useState(0)

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setShowWarning(false)
    timerRef.current = setTimeout(() => setShowWarning(true), TIMEOUT_MS - WARNING_MS)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/admin/login")
    router.refresh()
  }

  const extendSession = () => {
    setShowWarning(false)
    resetTimer()
  }

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"]
    const handler = () => resetTimer()
    events.forEach(e => window.addEventListener(e, handler))
    resetTimer()

    return () => {
      events.forEach(e => window.removeEventListener(e, handler))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!showWarning) return
    const end = Date.now() + WARNING_MS
    const tick = setInterval(() => {
      const left = Math.ceil((end - Date.now()) / 1000)
      if (left <= 0) {
        clearInterval(tick)
        logout()
      } else {
        setRemaining(left)
      }
    }, 200)
    return () => clearInterval(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWarning])

  if (!showWarning) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Session Expiring</h3>
        <p className="text-sm text-gray-500 mb-4">
          Your session will expire in <span className="font-semibold text-gray-700">{remaining}s</span> due to inactivity.
        </p>
        <div className="flex gap-3">
          <button
            onClick={logout}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Logout
          </button>
          <button
            onClick={extendSession}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors shadow-sm"
          >
            Stay Signed In
          </button>
        </div>
      </div>
    </div>
  )
}
