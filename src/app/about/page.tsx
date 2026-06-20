import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/constants"

export const metadata: Metadata = {
  title: "About Us – Techpivo",
  description: "Techpivo is your trusted source for breaking tech news, in-depth reviews, and expert analysis on AI, cybersecurity, gadgets, and digital innovation.",
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: { title: "About Us – Techpivo", description: "Learn about Techpivo's mission, team, and editorial standards.", url: `${SITE_URL}/about` },
  twitter: { card: "summary_large_image", title: "About Us – Techpivo", description: "Learn about Techpivo's mission, team, and editorial standards." },
}

export default function AboutPage() {
  return (
    <div className="w-full">
      {/* Hero */}
      <div className="relative overflow-hidden mb-12 min-h-[320px] flex items-center">
        <img src="https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg" alt="Modern tech workspace" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 px-6 md:px-12 lg:px-16 py-16 text-white max-w-4xl">
          <h1 className="text-4xl font-bold mb-4">About Techpivo</h1>
          <p className="text-lg text-white/80 max-w-2xl">
            Your trusted destination for technology news, expert reviews, and in-depth analysis since 2024.
          </p>
        </div>
      </div>

      <div className="px-4 md:px-12 lg:px-16 pb-12">

      {/* Mission */}
      <section className="mb-12 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            At Techpivo, we believe that understanding technology is essential for everyone. Our mission is to
            demystify complex tech topics and deliver accurate, timely, and actionable information to our readers.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            We are committed to journalistic integrity, editorial independence, and the highest standards of
            accuracy. Every article undergoes rigorous fact-checking and review before publication.
          </p>
        </div>
        <div className="relative h-64 rounded-xl overflow-hidden">
          <img src="https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg" alt="Team collaboration" className="absolute inset-0 w-full h-full object-cover" />
        </div>
      </section>

      {/* Editorial Standards */}
      <section className="mb-12">
        <div className="relative h-48 rounded-xl overflow-hidden mb-6">
          <img src="https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg" alt="Modern office space" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <h2 className="absolute bottom-4 left-6 text-2xl font-bold text-white">Editorial Standards</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border rounded-xl p-6">
            <h3 className="font-bold text-lg mb-2">Fact-Checking</h3>
            <p className="text-sm text-muted-foreground">Every story is verified against multiple authoritative sources before publication. Corrections are promptly issued when errors are identified.</p>
          </div>
          <div className="bg-card border rounded-xl p-6">
            <h3 className="font-bold text-lg mb-2">Independence</h3>
            <p className="text-sm text-muted-foreground">Our editorial team operates independently of advertisers and sponsors. Sponsored content is clearly labelled to maintain transparency.</p>
          </div>
          <div className="bg-card border rounded-xl p-6">
            <h3 className="font-bold text-lg mb-2">Diversity & Inclusion</h3>
            <p className="text-sm text-muted-foreground">We strive to represent diverse perspectives in our coverage and ensure our content is accessible to a global audience.</p>
          </div>
          <div className="bg-card border rounded-xl p-6">
            <h3 className="font-bold text-lg mb-2">Privacy Respect</h3>
            <p className="text-sm text-muted-foreground">We minimize data collection and never sell personal information. See our <Link href="/privacy-policy" className="text-accent hover:underline">Privacy Policy</Link> for details.</p>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="mb-12 grid md:grid-cols-2 gap-8 items-center">
        <div className="relative h-64 rounded-xl overflow-hidden md:order-2">
          <img src="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg" alt="Team meeting" className="absolute inset-0 w-full h-full object-cover" />
        </div>
        <div className="md:order-1">
          <h2 className="text-2xl font-bold mb-4">Our Team</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Techpivo is powered by a global network of experienced journalists, technology experts, and content
            creators who share a passion for innovation. Our team brings decades of combined experience from
            leading technology publications and the software industry.
          </p>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="relative rounded-2xl overflow-hidden p-8 text-center">
        <img src="https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg" alt="Contact us" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#0F172A]/85" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-3 text-white">Get in Touch</h2>
          <p className="text-white/80 mb-6">
            Have a tip, question, or feedback? We would love to hear from you.
          </p>
          <Link href="/contact" className="inline-flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
            Contact Us
          </Link>
        </div>
      </section>
      </div>
    </div>
  )
}
