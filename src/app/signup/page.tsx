"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Signup failed")
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
        <div className="w-full max-w-sm bg-card border rounded-2xl p-8 shadow-lg text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h1 className="text-xl font-bold mb-2">Check your email</h1>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
          <Link href="/login" className="text-sm font-medium hover:underline" style={{ color: "hsl(var(--accent))" }}>Back to sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm bg-card border rounded-2xl p-8 shadow-lg">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-black" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text)" }}>Blizine</Link>
          <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>Create your free account</p>
        </div>

        {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-4">{error}</div>}

        <button onClick={handleGoogleLogin} disabled={loading} className="w-full flex items-center justify-center gap-3 border rounded-lg p-3 mb-5 text-sm font-medium hover:border-accent transition-colors" style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--card)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span className="text-xs" style={{ color: "var(--muted2)" }}>or sign up with email</span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>

        <form onSubmit={handleSignup} className="space-y-3">
          <input type="text" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          <div className="relative">
            <input type={showPassword ? "text" : "password"} placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full border rounded-lg px-4 py-2.5 pr-10 text-sm outline-none focus:border-accent" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1" style={{ color: "var(--muted2)" }} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
          <button type="submit" disabled={loading} className="w-full text-white font-semibold py-2.5 rounded-lg text-sm transition-opacity hover:opacity-90" style={{ background: "hsl(var(--accent))" }}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "var(--muted)" }}>
          Already have an account?{" "}
          <Link href="/login" className="font-medium hover:underline" style={{ color: "hsl(var(--accent))" }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
