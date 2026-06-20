import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Cookies Policy – Techpivo",
  description: "Techpivo's Cookies Policy explains how we use cookies and similar technologies to enhance your experience, analyze traffic, and serve personalized ads.",
  alternates: { canonical: `${SITE_URL}/cookies-policy` },
  openGraph: { title: "Cookies Policy – Techpivo", description: "How Techpivo uses cookies and tracking technologies.", url: `${SITE_URL}/cookies-policy` },
  twitter: { card: "summary_large_image", title: "Cookies Policy – Techpivo", description: "How Techpivo uses cookies and tracking technologies." },
}

export default function CookiesPolicyPage() {
  return (
    <div className="w-full">
      {/* Hero */}
      <div className="relative overflow-hidden mb-12 min-h-[320px] flex items-center">
        <img src="https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg" alt="Cookies and tracking" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 px-6 md:px-12 lg:px-16 py-16 text-white max-w-4xl">
          <div className="text-5xl mb-4">🍪</div>
          <h1 className="text-4xl font-bold mb-2">Cookies Policy</h1>
          <p className="text-lg text-white/80">How Techpivo uses cookies and similar tracking technologies to improve your experience.</p>
          <p className="text-sm text-white/60 mt-4">Last updated: May 27, 2026</p>
        </div>
      </div>

      <div className="px-4 md:px-12 lg:px-16 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <section className="bg-card border rounded-2xl p-6 md:col-span-2">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xl shrink-0">📖</div>
            <div>
              <h2 className="text-2xl font-bold mb-2">What Are Cookies?</h2>
              <p className="text-muted-foreground leading-relaxed">Cookies are small text files stored on your device when you visit a website. They help websites remember preferences, understand usage, and deliver relevant content. By continuing to use Techpivo, you consent to cookie use as described here.</p>
            </div>
          </div>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <div className="text-center mb-4">
            <span className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl mx-auto">📋</span>
          </div>
          <h2 className="text-xl font-bold mb-4 text-center">Types of Cookies</h2>
          <div className="space-y-3">
            {[
              { icon: "✓", label: "Essential", color: "bg-green-100 dark:bg-green-900/30" },
              { icon: "📊", label: "Analytics", color: "bg-blue-100 dark:bg-blue-900/30" },
              { icon: "🎯", label: "Advertising", color: "bg-amber-100 dark:bg-amber-900/30" },
              { icon: "⚙️", label: "Preference", color: "bg-purple-100 dark:bg-purple-900/30" },
            ].map((t) => (
              <div key={t.label} className="flex items-center gap-3 bg-card border rounded-lg p-3">
                <span className={`w-8 h-8 rounded-lg ${t.color} flex items-center justify-center text-sm`}>{t.icon}</span>
                <span className="font-medium text-sm">{t.label} Cookies</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xl shrink-0">🏢</div>
            <div>
              <h2 className="text-xl font-bold mb-2">Third-Party Cookies</h2>
              <p className="text-muted-foreground text-sm">We work with Google AdSense, Google Analytics, and social media platforms that may set their own cookies.</p>
            </div>
          </div>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xl shrink-0">🔧</div>
            <div>
              <h2 className="text-xl font-bold mb-2">Manage Cookies</h2>
              <p className="text-muted-foreground text-sm">Control cookies via browser settings, opt out of personalized ads at <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener" className="text-accent hover:underline">Google&apos;s Ads Settings</a>, or use cookie consent tools.</p>
            </div>
          </div>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xl shrink-0">🇪🇺</div>
            <div>
              <h2 className="text-xl font-bold mb-2">GDPR Compliance</h2>
              <p className="text-muted-foreground text-sm">For EEA users, we comply with GDPR. We obtain consent before placing non-essential cookies. See our <Link href="/privacy-policy" className="text-accent hover:underline">Privacy Policy</Link>.</p>
            </div>
          </div>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">🔄</div>
            <div>
              <h2 className="text-xl font-bold mb-2">Updates</h2>
              <p className="text-muted-foreground text-sm">We may update this policy to reflect changes in technology, regulation, or data practices.</p>
            </div>
          </div>
        </section>
      </div>

      <section className="bg-card border rounded-2xl p-8 text-center mt-8">
        <h2 className="text-2xl font-bold mb-3">Have Questions About Cookies?</h2>
        <p className="text-muted-foreground mb-4">If you have any questions about our use of cookies, please contact us.</p>
        <Link href="/contact" className="inline-flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">Contact Us</Link>
      </section>
      </div>
    </div>
  )
}
