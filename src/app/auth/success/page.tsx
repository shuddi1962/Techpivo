"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthSuccessPage() {
  const router = useRouter()
  const supabase = createClient()
  const [verified, setVerified] = useState(true)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setVerified(!!data.session)
      setChecked(true)
    })
  }, [supabase])

  const goToAccount = () => {
    router.push("/account")
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-md bg-card border rounded-2xl p-10 shadow-lg text-center" style={{ background: "var(--card)" }}>
        <div className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text)" }}>Email confirmed!</h1>
        <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--muted)" }}>
          {checked && verified
            ? "Your email has been verified and you're signed in. Welcome to Techpivo!"
            : "Your email has been verified. Sign in to continue to your account."}
        </p>

        <button
          onClick={goToAccount}
          className="w-full text-white font-semibold py-2.5 rounded-lg text-sm transition-opacity hover:opacity-90"
          style={{ background: "hsl(var(--accent))" }}
        >
          Go to My Account
        </button>

        <div className="mt-6 flex items-center justify-center gap-6 text-sm">
          <Link href="/" className="hover:underline" style={{ color: "var(--muted)" }}>Back to homepage</Link>
          <Link href="/community" className="hover:underline" style={{ color: "var(--muted)" }}>Explore community</Link>
        </div>
      </div>
    </div>
  )
}
