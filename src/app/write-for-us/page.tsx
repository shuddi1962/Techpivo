import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Write For Us – Techpivo",
  description: "Contribute to Techpivo. We welcome guest posts, expert insights, and original research on technology, AI, cybersecurity, and digital innovation.",
  openGraph: { title: "Write For Us – Techpivo", description: "Contribute to Techpivo as a guest writer." },
}

export default function WriteForUsPage() {
  return (
    <div className="w-full">
      {/* Hero Banner */}
      <div className="relative overflow-hidden mb-12 min-h-[320px] flex items-center">
        <img src="https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg" alt="Write for us" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 px-6 md:px-12 lg:px-16 py-16 text-white max-w-4xl">
          <h1 className="text-4xl font-bold mb-4">Write For Us</h1>
          <p className="text-lg text-white/80 max-w-2xl">
            Share your expertise with thousands of tech enthusiasts. We welcome contributions from writers,
            developers, and industry professionals.
          </p>
        </div>
      </div>

      <div className="px-4 md:px-12 lg:px-16 pb-12">
      {/* Guidelines */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Submission Guidelines</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: "Original Content", desc: "All submissions must be original and not published elsewhere. We use plagiarism detection tools." },
            { title: "Length", desc: "Articles should be 1,000–2,500 words. Well-researched pieces with data and examples perform best." },
            { title: "Tone & Style", desc: "Professional yet accessible. Avoid overly promotional language. Write for a knowledgeable but general tech audience." },
            { title: "Formatting", desc: "Use clear headings, bullet points, and short paragraphs. Include at least one featured image (1200x630px)." },
            { title: "Citations", desc: "Cite all sources with hyperlinks. Fact-check all claims and statistics before submitting." },
            { title: "Author Bio", desc: "Include a short bio (2-3 sentences) and a headshot. You may include one link to your personal site or LinkedIn." },
          ].map((g) => (
            <div key={g.title} className="bg-card border rounded-xl p-5">
              <h3 className="font-bold mb-1">{g.title}</h3>
              <p className="text-sm text-muted-foreground">{g.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Topics */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Topics We Cover</h2>
        <div className="flex flex-wrap gap-2">
          {["Artificial Intelligence", "Machine Learning", "Cybersecurity", "Cloud Computing", "DevOps", "Web Development", "Mobile Apps", "Gadgets & Hardware", "Startups", "Digital Business", "Programming Languages", "Open Source", "Tech Reviews", "Tutorials & How-Tos", "Tech Industry Analysis"].map((topic) => (
            <span key={topic} className="bg-accent/10 text-accent px-3 py-1.5 rounded-full text-sm font-medium">{topic}</span>
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Our Process</h2>
        <div className="space-y-4">
          {[
            { step: "1", title: "Pitch Your Idea", desc: "Send a short outline (2-3 paragraphs) to our editorial team." },
            { step: "2", title: "Get Approved", desc: "We review your pitch and confirm within 3-5 business days." },
            { step: "3", title: "Write & Submit", desc: "Write your article following our guidelines and submit via email." },
            { step: "4", title: "Review & Publish", desc: "Our editors review for quality, accuracy, and SEO. We publish within 7 days of approval." },
          ].map((p) => (
            <div key={p.step} className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold shrink-0">{p.step}</div>
              <div>
                <h3 className="font-bold">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-card border-2 border-accent/30 rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-bold mb-3">Ready to Contribute?</h2>
        <p className="text-muted-foreground mb-6">
          Send your pitch or complete article to our editorial team and we will review it within 3-5 business days.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="mailto:editorial@Techpivo.com?subject=Pitch%3A%20Article%20Submission%20for%20Techpivo"
            className="inline-flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Send via Email
          </a>
          <a
            href="/contact?subject=Writing%20Inquiry"
            className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white px-6 py-3 rounded-lg font-medium hover:border-accent transition-colors shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Contact Us Instead
          </a>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          We typically respond within 48 hours. All submissions are treated confidentially.
        </p>
      </section>
      </div>
    </div>
  )
}
