import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Advertise With Us – Techpivo",
  description: "Reach a highly engaged tech audience. Explore advertising opportunities on Techpivo including display ads, sponsored content, and newsletter placements.",
  openGraph: { title: "Advertise With Us – Techpivo", description: "Explore advertising opportunities on Techpivo." },
}

export default function AdvertisePage() {
  return (
    <div className="w-full">
      {/* Hero */}
      <div className="relative overflow-hidden mb-12 min-h-[320px] flex items-center">
        <Image src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg" alt="Advertise with us" fill className="object-cover" sizes="100vw" priority />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 px-6 md:px-12 lg:px-16 py-16 text-white max-w-4xl">
          <h1 className="text-4xl font-bold mb-4">Advertise With Us</h1>
          <p className="text-lg text-white/80">Connect your brand with thousands of tech-savvy professionals and enthusiasts who trust Techpivo daily.</p>
        </div>
      </div>

      <div className="px-4 md:px-12 lg:px-16 pb-12">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          { value: "50K+", label: "Monthly Visitors" },
          { value: "8K+", label: "Newsletter Subscribers" },
          { value: "95%", label: "Reader Satisfaction" },
          { value: "4M+", label: "Monthly Impressions" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-accent mb-1">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Ad Formats */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Available Ad Formats</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: "Display Ads", desc: "Banner and sidebar placements in premium positions. Available in multiple sizes (728x90, 300x250, 160x600). Flexible pricing for long-term partnerships.", price: "From $99/week" },
            { title: "Sponsored Content", desc: "Native articles that blend seamlessly with editorial content. Includes social media promotion and newsletter feature.", price: "From $299/post" },
            { title: "Newsletter Sponsorship", desc: "Get your brand in front of our engaged email subscribers with a dedicated placement in our weekly newsletter.", price: "From $149/send" },
            { title: "Affiliate Partnerships", desc: "Promote your products through our trusted affiliate network with performance-based pricing.", price: "Commission-based" },
          ].map((fmt) => (
            <div key={fmt.title} className="bg-card border rounded-xl p-6 flex flex-col gap-3">
              <h3 className="font-bold text-lg">{fmt.title}</h3>
              <p className="text-sm text-muted-foreground flex-1">{fmt.desc}</p>
              <div className="text-accent font-bold">{fmt.price}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Techpivo */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Why Advertise With Techpivo?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "Targeted Audience", desc: "Reach decision-makers, developers, and tech enthusiasts actively seeking quality content.", img: "https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg" },
            { title: "High Engagement", desc: "Our readers spend an average of 4+ minutes per session, ensuring your message is seen.", img: "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg" },
            { title: "Brand Safety", desc: "Your ads appear alongside professionally curated, family-safe content in a trusted environment.", img: "https://images.pexels.com/photos/577585/pexels-photo-577585.jpeg" },
          ].map((item) => (
            <div key={item.title} className="bg-card border rounded-xl overflow-hidden">
              <div className="relative h-40">
                <Image src={item.img} alt={item.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
              </div>
              <div className="p-5">
                <h3 className="font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-card border rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-bold mb-3">Ready to Get Started?</h2>
        <p className="text-muted-foreground mb-6">Contact our advertising team for a customized proposal.</p>
        <a href="mailto:ads@techpivo.com" className="inline-flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">ads@techpivo.com</a>
      </section>
      </div>
    </div>
  )
}
