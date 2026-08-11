"use client";

import { useState } from "react";
import { newsletterSchema } from "@/lib/validation";
import { sanitizeEmail } from "@/lib/sanitize";

export default function NewsletterSubscribe() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    const result = newsletterSchema.shape.email.safeParse(e.target.value);
    if (!result.success) setError(result.error.issues[0]?.message || "");
    else setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = newsletterSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0]?.message || "Invalid email");
      return;
    }
    const sanitizedEmail = sanitizeEmail(result.data.email);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: sanitizedEmail }),
      });
      if (!res.ok) throw new Error("Failed to subscribe");
      setSubscribed(true);
    } catch {
      setError("Failed to subscribe. Please try again.");
    }
  };

  return (
    <section className="bg-accent/5 border border-accent/20 rounded-2xl p-8 mb-12 text-center" id="subscribe">
      {subscribed ? (
        <div>
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-2">You&apos;re Subscribed!</h2>
          <p className="text-muted-foreground">Check your inbox for a confirmation email. Welcome to the Techpivo community!</p>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold mb-2">Subscribe to Our Newsletter</h2>
          <p className="text-muted-foreground mb-6">Join 8,000+ subscribers who stay informed with Techpivo.</p>
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex gap-3">
              <input
                type="email"
                value={email}
                onChange={handleChange}
                placeholder="your@email.com"
                className={`flex-1 bg-background border rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none ${error ? "border-red-500" : ""}`}
              />
              <button type="submit" disabled={!!error} className="bg-accent text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm whitespace-nowrap disabled:opacity-50">
                Subscribe Free
              </button>
            </div>
            {error && <p className="text-red-500 text-xs mt-2 text-left">{error}</p>}
          </form>
          <p className="text-xs text-muted-foreground mt-4">No spam, ever. Unsubscribe anytime.</p>
        </>
      )}
    </section>
  );
}