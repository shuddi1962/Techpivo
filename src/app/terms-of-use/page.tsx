import type { Metadata } from "next"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Terms of Use – Techpivo",
  description: "Techpivo's Terms of Use governing access to and use of our website, content, and services.",
  openGraph: { title: "Terms of Use – Techpivo" },
}

export default function TermsOfUsePage() {
  return (
    <div className="w-full">
      {/* Hero */}
      <div className="relative overflow-hidden mb-12 min-h-[320px] flex items-center">
        <Image src="https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg" alt="Legal documents" fill className="object-cover" sizes="100vw" priority />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 px-6 md:px-12 lg:px-16 py-16 text-white max-w-4xl">
          <div className="text-5xl mb-4">📜</div>
          <h1 className="text-4xl font-bold mb-2">Terms of Use</h1>
          <p className="text-lg text-white/80">The rules and guidelines governing your use of Techpivo.</p>
          <p className="text-sm text-white/60 mt-4">Last updated: May 27, 2026</p>
        </div>
      </div>

      <div className="px-4 md:px-12 lg:px-16 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <section className="bg-card border rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">By accessing or using Techpivo (&quot;the Site&quot;), you agree to be bound by these Terms of Use. If you do not agree with any part of these terms, you must not use the Site.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6 md:col-span-2">
          <div className="relative h-40 rounded-xl overflow-hidden mb-4">
            <Image src="https://images.pexels.com/photos/577585/pexels-photo-577585.jpeg" alt="Intellectual property" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
          </div>
          <h2 className="text-2xl font-bold mb-4">2. Intellectual Property Rights</h2>
          <p className="text-muted-foreground mb-3">All content published on Techpivo, including articles, images, graphics, logos, and code, is the property of Techpivo or its content providers.</p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Republish material from Techpivo without attribution</li>
            <li>Sell, rent, or sub-license content from Techpivo</li>
            <li>Reproduce, duplicate, or copy content for commercial purposes</li>
            <li>Redistribute content unless expressly made available</li>
          </ul>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">3. User Conduct</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Provide accurate information</li>
            <li>Not use the Site for unlawful purposes</li>
            <li>Not disrupt site security</li>
            <li>Not post harmful content</li>
            <li>Respect other users</li>
          </ul>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <div className="relative h-32 rounded-xl overflow-hidden mb-4">
            <Image src="https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg" alt="User content" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
          </div>
          <h2 className="text-2xl font-bold mb-4">4. User-Generated Content</h2>
          <p className="text-muted-foreground">By submitting comments or content, you grant us a non-exclusive, royalty-free license. We reserve the right to moderate or remove content that violates our policies.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <div className="relative h-32 rounded-xl overflow-hidden mb-4">
            <Image src="https://images.pexels.com/photos/4476377/pexels-photo-4476377.jpeg" alt="Affiliate" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
          </div>
          <h2 className="text-2xl font-bold mb-4">5. Affiliate Disclosure</h2>
          <p className="text-muted-foreground">Techpivo participates in affiliate marketing programs. We may earn commissions on purchases through links on our site at no additional cost to you.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">6. Disclaimer</h2>
          <p className="text-muted-foreground">Information on Techpivo is for general informational purposes only. We make no warranties about completeness, accuracy, or reliability of the information.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">7. Limitation of Liability</h2>
          <p className="text-muted-foreground">Techpivo shall not be liable for any damages arising from the use or inability to use our Site.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">8. External Links</h2>
          <p className="text-muted-foreground">Our Site may contain links to third-party websites. We assume no responsibility for their content or practices.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">9. Changes to Terms</h2>
          <p className="text-muted-foreground">We reserve the right to modify these terms. Changes are effective immediately upon posting.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">10. Governing Law</h2>
          <p className="text-muted-foreground">These terms shall be governed by the laws of the United States and the State of California.</p>
        </section>
      </div>

      <section className="bg-card border rounded-2xl p-8 text-center mt-8">
        <h2 className="text-2xl font-bold mb-3">11. Contact</h2>
        <p className="text-muted-foreground mb-4">For questions about these Terms of Use, please contact us.</p>
        <a href="mailto:legal@Techpivo.com" className="inline-flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">legal@Techpivo.com</a>
      </section>
      </div>
    </div>
  )
}
