import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Disclaimer – Techpivo",
  description: "Blizine's Disclaimer covering affiliate relationships, advertising, paid content, and professional advice.",
  openGraph: { title: "Disclaimer – Techpivo", description: "Important disclaimers about Blizine's content." },
}

export default function DisclaimerPage() {
  return (
    <div className="w-full">
      {/* Hero */}
      <div className="relative overflow-hidden mb-12 min-h-[320px] flex items-center">
        <Image src="https://images.pexels.com/photos/6863515/pexels-photo-6863515.jpeg" alt="Legal disclaimer" fill className="object-cover" sizes="100vw" priority />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 px-6 md:px-12 lg:px-16 py-16 text-white max-w-4xl">
          <div className="text-5xl mb-4">⚖️</div>
          <h1 className="text-4xl font-bold mb-2">Disclaimer</h1>
          <p className="text-lg text-white/80">Transparency matters. Everything you need to know about our affiliate relationships, advertising practices, and more.</p>
          <p className="text-sm text-white/60 mt-4">Last updated: May 27, 2026</p>
        </div>
      </div>

      <div className="px-4 md:px-12 lg:px-16 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <section className="bg-card border rounded-2xl p-6">
          <div className="relative h-36 rounded-xl overflow-hidden mb-4">
            <Image src="https://images.pexels.com/photos/4476377/pexels-photo-4476377.jpeg" alt="Affiliate" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xl mb-3">🔗</div>
          <h2 className="text-xl font-bold mb-2">Affiliate Disclosure</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">Techpivo participates in affiliate marketing programs. When you click on links and make a purchase, we may earn a commission at no extra cost to you. This never influences our editorial coverage.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <div className="relative h-36 rounded-xl overflow-hidden mb-4">
            <Image src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg" alt="Advertising" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl mb-3">📢</div>
          <h2 className="text-xl font-bold mb-2">Advertising Disclosure</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">Techpivo displays ads from third-party networks including Google AdSense. Ads are clearly distinguished from editorial content. See our <Link href="/cookies-policy" className="text-accent hover:underline">Cookies Policy</Link>.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <div className="relative h-36 rounded-xl overflow-hidden mb-4">
            <Image src="https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg" alt="Sponsored content" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xl mb-3">💳</div>
          <h2 className="text-xl font-bold mb-2">Paid Content</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">Sponsored content is clearly labeled. Our editorial team maintains full control to ensure it meets our quality standards.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xl mb-3">💳</div>
          <h2 className="text-xl font-bold mb-2">Payment Processing</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">Payments are handled by third-party processors. Techpivo does not store or process your full payment details.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xl mb-3">🍪</div>
          <h2 className="text-xl font-bold mb-2">Cookies & Tracking</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">We use cookies to enhance your experience. By using our site, you consent to cookie use per our <Link href="/cookies-policy" className="text-accent hover:underline">Cookies Policy</Link>.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xl mb-3">⚠️</div>
          <h2 className="text-xl font-bold mb-2">No Professional Advice</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">Content on Techpivo is for informational purposes only. It does not constitute financial, legal, medical, or technical advice.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl mb-3">📝</div>
          <h2 className="text-xl font-bold mb-2">Accuracy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">While we strive for accuracy, we make no warranties about completeness or reliability of information. Use at your own risk.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-xl mb-3">🔗</div>
          <h2 className="text-xl font-bold mb-2">External Links</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">Our site may contain links to external websites. Inclusion does not imply endorsement by Techpivo.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xl mb-3">🔄</div>
          <h2 className="text-xl font-bold mb-2">Updates</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">We reserve the right to update this Disclaimer. Changes are effective immediately upon posting.</p>
        </section>
      </div>

      <section className="bg-card border rounded-2xl p-8 text-center mt-8">
        <h2 className="text-2xl font-bold mb-3">Questions About Our Disclaimers?</h2>
        <p className="text-muted-foreground mb-4">Please reach out to us with any questions or concerns.</p>
        <Link href="/contact" className="inline-flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">Contact Us</Link>
      </section>
      </div>
    </div>
  )
}
