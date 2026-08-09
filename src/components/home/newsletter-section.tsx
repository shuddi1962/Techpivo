"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function NewsletterSection() {
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    if (!email || loading) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error("Failed to subscribe")
      setEmail("")
      setSubscribed(true)
    } catch (err) {
      console.error("Subscribe error:", err)
      setError("Failed to subscribe. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-xl bg-gradient-to-r from-brand-navy to-[#1a1a3e] p-8 md:p-12">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Stay Ahead of the Curve</h2>
        <p className="text-gray-400 mb-6">Get the latest tech news, tutorials, and insights delivered to your inbox weekly.</p>
        {subscribed ? (
          <p className="text-green-400 font-medium">Thanks for subscribing! Check your inbox for a welcome email.</p>
        ) : (
          <div className="flex gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
            />
            <Button onClick={handleSubscribe} disabled={loading} className="shrink-0 bg-brand-amber hover:bg-brand-amber/90">
              {loading ? "Subscribing..." : "Subscribe"}
            </Button>
          </div>
        )}
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>
    </section>
  )
}
