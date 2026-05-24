"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

export function NewsletterSection() {
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = async () => {
    if (!email) return
    const supabase = createClient()
    await supabase.from("subscribers").insert({ email })
    setEmail("")
    setSubscribed(true)
  }

  return (
    <section className="rounded-xl bg-gradient-to-r from-brand-navy to-[#1a1a3e] p-8 md:p-12">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Stay Ahead of the Curve</h2>
        <p className="text-gray-400 mb-6">Get the latest tech news, tutorials, and insights delivered to your inbox weekly.</p>
        {subscribed ? (
          <p className="text-green-400 font-medium">Thanks for subscribing!</p>
        ) : (
          <div className="flex gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
            />
            <Button onClick={handleSubscribe} className="shrink-0 bg-brand-indigo hover:bg-brand-indigo/90">
              Subscribe
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
