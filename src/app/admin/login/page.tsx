"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, LogIn, Shield, Zap, AlertTriangle } from "lucide-react"

export default function AdminLoginPage() {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mounted, setMounted] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [blocked, setBlocked] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (cooldown > 0) {
      const t = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000)
      return () => clearInterval(t)
    }
  }, [cooldown])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (blocked || cooldown > 0) return

    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "techpivohub@gmail.com", password }),
      })
      const data = await res.json()
      if (!res.ok) {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        if (res.status === 429) {
          setBlocked(true)
          setCooldown(data.cooldown || 60)
          setError("Too many attempts. Please wait before trying again.")
        } else if (newAttempts >= 3) {
          setCooldown(15)
          setError(`Wrong password. ${newAttempts} of 5 attempts used. Try again in 15s.`)
        } else {
          setError(data.error || "Login failed")
        }
      } else {
        router.push("/admin")
        router.refresh()
      }
    } catch {
      setError("Connection error. Please try again.")
    }
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.04]">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)`,
          backgroundSize: '48px 48px'
        }} />
      </div>

      {/* Soft gradient accents */}
      <div className="absolute top-1/3 -left-40 w-80 h-80 bg-amber-200/40 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 -right-40 w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl" />

      {/* Floating dots */}
      {mounted && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 bg-amber-400/40 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${4 + Math.random() * 5}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 4}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Tech<span className="text-amber-600">pivo</span>
          </h1>
          <p className="text-sm mt-1.5 text-gray-500 font-medium">Admin Control Panel</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          {/* Status bar */}
          <div className="flex items-center gap-2 px-6 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-medium text-emerald-600">SECURE</span>
            </div>
            <span className="text-gray-300 mx-1">|</span>
            <span className="text-xs text-gray-400">techpivohub@gmail.com</span>
          </div>

          <div className="p-6">
            {error && (
              <div className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 mb-5">
                {blocked ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> : <Zap className="w-4 h-4 mt-0.5 shrink-0" />}
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    disabled={blocked}
                    placeholder="Enter your password"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !password || blocked}
                className="relative w-full flex items-center justify-center gap-2 text-white font-semibold py-2.5 rounded-lg text-sm transition-all bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center mt-6">
          <a href="/" className="text-xs text-gray-400 hover:text-amber-600 transition-colors">
            &larr; Back to site
          </a>
        </p>

        <p className="text-center text-[10px] mt-3 text-gray-300 font-mono">
          Techpivo CMS &mdash; Enterprise Edition
        </p>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-16px); }
        }
      `}</style>
    </div>
  )
}
