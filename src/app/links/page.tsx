"use client"

import Link from "next/link"

const linkGroups = [
  {
    title: "Platforms & Integrations",
    links: [
      { name: "Social Media Accounts", href: "/admin/social", desc: "Connect Twitter, Facebook, LinkedIn, and more" },
      { name: "Integrations Hub", href: "/admin/integrations", desc: "Manage all third-party services and APIs" },
      { name: "Auto-Publishing Settings", href: "/admin/social", desc: "Configure automated cross-posting" },
    ],
  },
  {
    title: "Content & Tools",
    links: [
      { name: "Posts", href: "/admin/posts", desc: "Manage your articles and blog posts" },
      { name: "Categories", href: "/admin/categories", desc: "Organize content by categories" },
      { name: "RSS Feeds", href: "/admin/rss-feeds", desc: "Import content from RSS sources" },
      { name: "Keywords", href: "/admin/keywords", desc: "SEO keyword research and tracking" },
    ],
  },
  {
    title: "Monetization",
    links: [
      { name: "Ads", href: "/admin/ads", desc: "Manage ad placements and campaigns" },
      { name: "Affiliate Programs", href: "/admin/affiliate", desc: "Set up affiliate marketing" },
      { name: "Newsletter", href: "/admin/newsletter", desc: "Email marketing and subscriber management" },
    ],
  },
]

export default function LinksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Quick Links</h1>
      <p className="text-muted-foreground mb-10">Everything you need to manage your Techpivo presence.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {linkGroups.map((group) => (
          <div key={group.title}>
            <h2 className="font-semibold text-lg mb-4 text-foreground">{group.title}</h2>
            <ul className="space-y-3">
              {group.links.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="block p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
                  >
                    <span className="font-medium text-sm block">{link.name}</span>
                    <span className="text-xs text-muted-foreground mt-1 block">{link.desc}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
