import Link from "next/link"

export function Footer({ categories, recentPosts }: { categories: any[]; recentPosts: any[] }) {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <div className="footer-logo">
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: "var(--text)" }}>Blizine</span>
          </div>
          <p className="footer-tagline">Tech, decoded. Fast.</p>
          <p className="footer-about">
            Blizine is your daily source for the latest in technology, AI, cybersecurity, gadgets, and digital innovation.
          </p>
          <div className="footer-socials">
            <Link href="#" className="footer-social-icon" aria-label="Twitter">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </Link>
            <Link href="#" className="footer-social-icon" aria-label="YouTube">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </Link>
            <Link href="#" className="footer-social-icon" aria-label="Telegram">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            </Link>
            <Link href="#" className="footer-social-icon" aria-label="Facebook">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </Link>
            <Link href="/rss.xml" className="footer-social-icon" aria-label="RSS">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><circle cx="19" cy="3" r="3"/><circle cx="5" cy="19" r="3"/><path d="M6 18A12 12 0 0 1 18 6"/><path d="M2 22A16 16 0 0 1 18 6"/></svg>
            </Link>
          </div>
        </div>

        <div>
          <h3 className="footer-col-title">Categories</h3>
          {categories.slice(0, 8).map((cat) => (
            <Link key={cat.id} href={`/category/${cat.slug}`} className="footer-col-link">
              {cat.name}
            </Link>
          ))}
        </div>

        <div>
          <h3 className="footer-col-title">Recent Articles</h3>
          {recentPosts.slice(0, 4).map((post) => (
            <Link key={post.id} href={`/${post.slug}`} className="footer-post-link">
              <span style={{ flexShrink: 0, marginTop: 3 }}>●</span>
              <span>{post.title?.slice(0, 48)}</span>
            </Link>
          ))}
        </div>

        <div>
          <h3 className="footer-col-title">Quick Links</h3>
          {["About Us", "Contact Us", "Advertise With Us", "Privacy Policy", "Terms of Use", "Sitemap", "RSS Feed", "Newsletter", "Write For Us"].map((l) => (
            <Link key={l} href="#" className="footer-col-link">
              <span>{l}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="footer-bottom">
        <span>&copy; {new Date().getFullYear()} Blizine.com. All rights reserved.</span>
        <span>Built with love for the tech community</span>
        <a href="mailto:hello@blizine.com" style={{ color: "var(--accent)", textDecoration: "none" }}>hello@blizine.com</a>
      </div>
    </footer>
  )
}
