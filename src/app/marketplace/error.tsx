"use client"

import Link from "next/link"
import { useEffect } from "react"

/**
 * Storefront-scoped error page: keeps the shopper inside the Market
 * experience (no main-site chrome, no dead ends) with retry + navigation.
 */
export default function MarketplaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Report the real crash (message + stack) so the cause can be fixed
  // instead of guessed — the server HTML alone never shows client crashes.
  useEffect(() => {
    try {
      fetch("/api/debug/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: window.location.href,
          error_message: `marketplace-boundary: ${error.message || String(error)} (digest: ${error.digest || "none"})`,
          error_stack: error.stack || null,
        }),
      }).catch(() => {})
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen">
      <div className="px-3 sm:px-6 lg:px-10 py-10">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 sm:p-10 text-center max-w-xl mx-auto">
          <span
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-xl font-extrabold text-white mb-4"
            style={{ background: "#0F172A" }}
          >
            T
          </span>
          <h1 className="text-xl font-extrabold text-[#0F172A]">The shelf wobbled for a second</h1>
          <p className="text-sm text-slate-500 mt-2">
            We couldn&apos;t load this part of TechPivo Market just now. Nothing was charged and
            your cart is safe — please try again.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-6">
            <button
              onClick={reset}
              className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-bold px-6 py-3 rounded-lg transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/marketplace"
              className="border border-[#E2E8F0] text-sm font-semibold px-6 py-3 rounded-lg hover:bg-slate-50 text-[#0F172A]"
            >
              Back to Market
            </Link>
            <Link
              href="/marketplace/track"
              className="border border-[#E2E8F0] text-sm font-semibold px-6 py-3 rounded-lg hover:bg-slate-50 text-[#0F172A]"
            >
              Track Order
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
