"use client"

import { useState } from "react"

export default function NewsletterPage() {
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) setSubscribed(true)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Newsletter</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Stay ahead of the curve. Get the latest tech news, expert analysis, and exclusive content delivered
          straight to your inbox every week.
        </p>
      </div>

      {/* Subscribe */}
      <section className="bg-accent/5 border border-accent/20 rounded-2xl p-8 mb-12 text-center">
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
            <form onSubmit={handleSubmit} className="max-w-md mx-auto flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 bg-background border rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
              />
              <button type="submit" className="bg-accent text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm whitespace-nowrap">
                Subscribe Free
              </button>
            </form>
            <p className="text-xs text-muted-foreground mt-4">No spam, ever. Unsubscribe anytime.</p>
          </>
        )}
      </section>

      {/* What to expect */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">What to Expect</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: "📰", title: "Weekly Digest", desc: "A curated roundup of the week's most important tech stories." },
            { icon: "🔍", title: "Exclusive Analysis", desc: "In-depth breakdowns of trends and events you won't find anywhere else." },
            { icon: "🎁", title: "Subscriber Perks", desc: "Early access to content, special offers, and community invites." },
          ].map((item) => (
            <div key={item.title} className="bg-card border rounded-xl p-6 text-center">
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-bold mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Past Issues */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Recent Editions</h2>
        <div className="space-y-3">
          {[
            { date: "May 20, 2026", title: "The AI Revolution Accelerates" },
            { date: "May 13, 2026", title: "Cybersecurity Threats to Watch" },
            { date: "May 6, 2026", title: "Cloud Computing Trends for 2026" },
            { date: "April 29, 2026", title: "Gadget Roundup: Summer Edition" },
          ].map((issue) => (
            <div key={issue.title} className="flex items-center justify-between bg-card border rounded-lg px-5 py-3">
              <div>
                <span className="text-sm text-muted-foreground">{issue.date}</span>
                <span className="mx-2 text-muted-foreground">—</span>
                <span className="font-medium">{issue.title}</span>
              </div>
              <span className="text-accent text-sm font-medium">Read →</span>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section>
        <h2 className="text-2xl font-bold mb-6">What Subscribers Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { quote: "Techpivo's newsletter is the first thing I read every Monday morning. The curation is outstanding.", name: "Alex K., Software Engineer" },
            { quote: "I've been subscribed for 6 months and the quality has been consistently excellent.", name: "Maria S., Product Manager" },
          ].map((t) => (
            <div key={t.name} className="bg-card border rounded-xl p-6">
              <p className="text-muted-foreground italic mb-3">&ldquo;{t.quote}&rdquo;</p>
              <p className="text-sm font-medium">{t.name}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
