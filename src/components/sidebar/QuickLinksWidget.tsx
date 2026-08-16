import Link from "next/link"

export function QuickLinksWidget() {
  return (
    <div className="sidebar-card">
      <div className="sidebar-card-header">
        <span className="sidebar-card-icon">📌</span>
        <span className="sidebar-card-title">Quick Links</span>
      </div>
      <div className="space-y-1">
        {[
          { href: "/marketplace", label: "Marketplace" },
          { href: "/about", label: "About Us" },
          { href: "/contact", label: "Contact Us" },
          { href: "/advertise", label: "Advertise With Us" },
          { href: "/newsletter", label: "Newsletter" },
          { href: "/privacy-policy", label: "Privacy Policy" },
          { href: "/terms-of-use", label: "Terms of Use" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-accent hover:bg-accent/5 rounded-lg transition-colors"
          >
            <span className="text-xs">›</span>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
