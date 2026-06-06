"use client"

import { useState } from "react"

export function NewsletterStrip() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle")

  const handleSubmit = async () => {
    if (!email.includes("@")) return
    setStatus("loading")
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      setStatus(res.ok ? "ok" : "err")
    } catch {
      setStatus("err")
    }
  }

  return (
    <div className="newsletter-strip">
      <div className="newsletter-strip-bg" />
      <div className="newsletter-strip-inner">
        <div>
          <h2 className="newsletter-headline">Stay Ahead of the Tech Curve</h2>
          <p className="newsletter-subline">
            Get the best tech stories delivered to your inbox every morning, completely free.
          </p>
          <div className="newsletter-badges">
            <span className="nl-badge">No spam</span>
            <span className="nl-badge">Unsubscribe anytime</span>
            <span className="nl-badge">Privacy protected</span>
          </div>
        </div>
        <div className="newsletter-right">
          {status === "ok" ? (
            <div className="newsletter-success">
              <span style={{ fontSize: 28 }}>You&apos;re subscribed!</span>
              <span className="nl-badge">Check your inbox.</span>
            </div>
          ) : (
            <>
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="newsletter-email-input"
              />
              <button
                className="newsletter-submit-btn"
                onClick={handleSubmit}
                disabled={status === "loading"}
              >
                {status === "loading" ? "Subscribing..." : "Subscribe Free"}
              </button>
              {status === "err" && (
                <span className="nl-error">Something went wrong. Please try again.</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
