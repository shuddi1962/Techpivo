"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { CheckCircle2, Loader2, PackageSearch, XCircle } from "lucide-react"
import { clearCart } from "@/lib/marketplace-cart"

function Inner() {
  const params = useSearchParams()
  const reference = params.get("reference") || params.get("trxref") || ""
  const [state, setState] = useState<"verifying" | "paid" | "failed" | "noref">("noref")
  const [detail, setDetail] = useState("")

  useEffect(() => {
    if (!reference) {
      setState("noref")
      return
    }
    setState("verifying")
    fetch("/api/marketplace/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j?.paid) {
          setState("paid")
          clearCart()
          try {
            const last = sessionStorage.getItem("tpm_last_order")
            if (last) {
              const parsed = JSON.parse(last) as { reference?: string }
              if (parsed.reference === reference) sessionStorage.removeItem("tpm_last_order")
            }
          } catch {
            // ignore
          }
          setDetail(j?.cj_order_id ? "Sent to our fulfillment partner — tracking will appear below shortly." : "Payment received — we are preparing your shipment.")
        } else {
          setState("failed")
          setDetail(j?.error || "Your payment was not confirmed.")
        }
      })
      .catch(() => {
        setState("failed")
        setDetail("Could not confirm your payment. Use Track Order with your reference.")
      })
  }, [reference])

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 sm:p-12 text-center max-w-xl mx-auto">
      {state === "verifying" && (
        <>
          <Loader2 className="h-12 w-12 text-[#F59E0B] animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-extrabold text-[#0F172A]">Confirming your payment...</h1>
          <p className="text-sm text-slate-500 mt-2">Reference: {reference}</p>
        </>
      )}
      {state === "paid" && (
        <>
          <CheckCircle2 className="h-12 w-12 text-[#10B981] mx-auto mb-4" />
          <h1 className="text-xl font-extrabold text-[#0F172A]">Payment successful</h1>
          <p className="text-sm text-slate-500 mt-2">{detail}</p>
          <p className="text-sm text-slate-500 mt-1">Reference: <strong className="text-[#0F172A]">{reference}</strong></p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-6">
            <Link href={`/marketplace/track?reference=${encodeURIComponent(reference)}`} className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-bold px-6 py-3 rounded-lg">
              Track your order
            </Link>
            <Link href="/marketplace" className="border text-sm font-semibold px-6 py-3 rounded-lg hover:bg-slate-50">
              Continue shopping
            </Link>
          </div>
        </>
      )}
      {state === "failed" && (
        <>
          <XCircle className="h-12 w-12 text-[#EF4444] mx-auto mb-4" />
          <h1 className="text-xl font-extrabold text-[#0F172A]">Payment not confirmed</h1>
          <p className="text-sm text-slate-500 mt-2">{detail}</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-6">
            <Link href="/marketplace/cart" className="bg-[#F59E0B] text-[#0F172A] text-sm font-bold px-6 py-3 rounded-lg">
              Back to cart
            </Link>
            <Link href="/marketplace/track" className="border text-sm font-semibold px-6 py-3 rounded-lg hover:bg-slate-50">
              Track order
            </Link>
          </div>
        </>
      )}
      {state === "noref" && (
        <>
          <PackageSearch className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h1 className="text-xl font-extrabold text-[#0F172A]">No payment reference</h1>
          <p className="text-sm text-slate-500 mt-2">If you just paid, use the Track Order page with your reference and email.</p>
          <Link href="/marketplace/track" className="inline-block mt-6 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-bold px-6 py-3 rounded-lg">
            Track order
          </Link>
        </>
      )}
    </div>
  )
}

export function CheckoutSuccess() {
  return (
    <Suspense fallback={<div className="bg-white rounded-2xl border p-10 text-center text-sm text-slate-500">Loading...</div>}>
      <Inner />
    </Suspense>
  )
}
