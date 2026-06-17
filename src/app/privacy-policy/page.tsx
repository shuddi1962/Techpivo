import type { Metadata } from "next"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Privacy Policy – Techpivo",
  description: "Techpivo's Privacy Policy explains how we collect, use, and protect your personal information in compliance with GDPR, CCPA, and Google AdSense policies.",
  openGraph: { title: "Privacy Policy – Techpivo", description: "How Techpivo handles your data." },
}

export default function PrivacyPolicyPage() {
  return (
    <div className="w-full">
      {/* Hero */}
      <div className="relative overflow-hidden mb-12 min-h-[320px] flex items-center">
        <Image src="https://images.pexels.com/photos/60504/security-protection-anti-virus-software-60504.jpeg" alt="Data security" fill className="object-cover" sizes="100vw" priority />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 px-6 md:px-12 lg:px-16 py-16 text-white">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-lg text-white/80">How Techpivo collects, uses, and protects your personal information.</p>
          <p className="text-sm text-white/60 mt-4">Last updated: May 27, 2026</p>
        </div>
      </div>

      <div className="px-4 md:px-12 lg:px-16 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <section className="bg-card border rounded-2xl p-6 col-span-full">
          <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
          <p className="text-muted-foreground leading-relaxed">Techpivo (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6 md:col-span-2">
          <div className="relative h-40 rounded-xl overflow-hidden mb-4">
            <Image src="https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg" alt="Data collection" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
          </div>
          <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
          <h3 className="font-bold mb-2">Personal Data</h3>
          <p className="text-muted-foreground mb-3">We may collect personally identifiable information such as your name and email address when you:</p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Subscribe to our newsletter</li>
            <li>Submit a contact form</li>
            <li>Leave a comment</li>
            <li>Create an account</li>
          </ul>
          <h3 className="font-bold mb-2 mt-4">Non-Personal Data</h3>
          <p className="text-muted-foreground">We automatically collect certain information when you visit our site, including browser type, pages visited, referral source, IP address (anonymized), and device type.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <div className="relative h-32 rounded-xl overflow-hidden mb-4">
            <Image src="https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg" alt="Cookies" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
          </div>
          <h2 className="text-2xl font-bold mb-4">3. Cookies & Tracking</h2>
          <p className="text-muted-foreground">We use cookies and similar tracking technologies to enhance your experience, analyze traffic, and serve personalized ads. You can control preferences through browser settings.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <div className="relative h-32 rounded-xl overflow-hidden mb-4">
            <Image src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg" alt="Advertising" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
          </div>
          <h2 className="text-2xl font-bold mb-4">4. Google AdSense</h2>
          <p className="text-muted-foreground">We use Google AdSense to display ads. Google and its partners use cookies to serve personalized ads. You can opt out via <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener" className="text-accent hover:underline">Google&apos;s Ads Settings</a>.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <div className="relative h-32 rounded-xl overflow-hidden mb-4">
            <Image src="https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg" alt="Data usage" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
          </div>
          <h2 className="text-2xl font-bold mb-4">5. How We Use Your Info</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>To operate and maintain our website</li>
            <li>To send newsletters (with consent)</li>
            <li>To respond to inquiries</li>
            <li>To analyze usage patterns</li>
            <li>To serve targeted ads</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <div className="relative h-32 rounded-xl overflow-hidden mb-4">
            <Image src="https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg" alt="Data sharing" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
          </div>
          <h2 className="text-2xl font-bold mb-4">6. Data Sharing</h2>
          <p className="text-muted-foreground">We do not sell your personal information. We may share data with service providers, advertising partners, and legal authorities when required.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">7. Data Retention</h2>
          <p className="text-muted-foreground">We retain your personal data only as long as necessary. Newsletter subscribers can unsubscribe anytime, and we will delete your data upon request.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6 md:col-span-2">
          <h2 className="text-2xl font-bold mb-4">8. Your Rights</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {["Right to Access", "Right to Rectification", "Right to Erasure (&quot;Right to be Forgotten&quot;)", "Right to Restrict Processing", "Right to Data Portability", "Right to Object"].map((right) => (
              <div key={right} className="bg-card border rounded-lg p-3 text-sm text-muted-foreground">{right}</div>
            ))}
          </div>
          <p className="text-muted-foreground mt-4">To exercise these rights, contact us at <a href="mailto:privacy@Techpivo.com" className="text-accent hover:underline">privacy@Techpivo.com</a>.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">9. Third-Party Links</h2>
          <p className="text-muted-foreground">Our site may contain links to third-party websites. We are not responsible for their privacy practices.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">10. Children&apos;s Privacy</h2>
          <p className="text-muted-foreground">Our services are not directed to individuals under 13. We do not knowingly collect personal information from children.</p>
        </section>

        <section className="bg-card border rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">11. Changes to Policy</h2>
          <p className="text-muted-foreground">We may update this policy. Changes will be posted with an updated &quot;Last updated&quot; date.</p>
        </section>
      </div>

      <section className="bg-card border rounded-2xl p-8 text-center mt-8">
        <h2 className="text-2xl font-bold mb-3">12. Contact Us</h2>
        <p className="text-muted-foreground mb-4">If you have any questions about this Privacy Policy, please reach out.</p>
        <a href="mailto:privacy@Techpivo.com" className="inline-flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">privacy@Techpivo.com</a>
      </section>
      </div>
    </div>
  )
}
