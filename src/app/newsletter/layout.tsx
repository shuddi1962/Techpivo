import type { Metadata } from "next"
import { SITE_URL } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Newsletter – Techpivo",
  description: "Subscribe to Techpivo's newsletter for weekly tech news, expert analysis, and exclusive content delivered to your inbox.",
  alternates: { canonical: `${SITE_URL}/newsletter` },
  openGraph: { title: "Newsletter – Techpivo", description: "Subscribe to Techpivo's newsletter.", url: `${SITE_URL}/newsletter` },
  twitter: { card: "summary_large_image", title: "Newsletter – Techpivo" },
}

export default function NewsletterLayout({ children }: { children: React.ReactNode }) {
  return children
}
