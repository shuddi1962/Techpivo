"use client"

import Link from "next/link"

/**
 * Branded fallback for route errors (including database outages).
 * Never show a raw stack or a bare "500" — visitors get a calm,
 * on-brand page with a way forward.
 */
export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#F8FAFC" }}>
      <div className="text-center max-w-md bg-white border border-[#E2E8F0] rounded-2xl px-8 py-10 shadow-sm">
        <Link href="/" className="inline-flex items-center gap-2 mb-6" aria-label="TechPivo home">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-lg text-xl font-extrabold text-white"
            style={{ background: "#0F172A" }}
          >
            T
          </span>
          <span className="text-lg font-extrabold text-[#0F172A]">TechPivo</span>
        </Link>
        <h1 className="text-xl font-extrabold text-[#0F172A] mb-2">This page needs a moment</h1>
        <p className="text-sm text-slate-500 mb-6">
          We hit a temporary hiccup loading this page. Your visit is safe — please try again and it
          should appear.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={reset}
            className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-bold px-6 py-3 rounded-lg transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="border border-[#E2E8F0] text-sm font-semibold px-6 py-3 rounded-lg hover:bg-slate-50 text-[#0F172A]"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  )
}
