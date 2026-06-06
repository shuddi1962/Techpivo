"use client"

import { useState } from "react"

export function NewsletterWidget() {
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
    <div className="nl-widget">
      <h3 className="nl-widget-title">Daily Tech Digest</h3>
      <p className="nl-widget-sub">Top 5 tech stories every morning.</p>
      {status === "ok" ? (
        <p className="nl-widget-sub" style={{ marginBottom: 0 }}>You&apos;re subscribed!</p>
      ) : (
        <>
          <input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="nl-widget-input"
          />
          <button className="nl-widget-btn" onClick={handleSubmit} disabled={status === "loading"}>
            {status === "loading" ? "..." : "Subscribe Free"}
          </button>
          <p className="nl-widget-note">No spam, unsubscribe anytime</p>
          {status === "err" && <p className="nl-error" style={{ textAlign: "center" }}>Failed. Try again.</p>}
        </>
      )}
    </div>
  )
}
