import type { Metadata } from "next"
import { SITE_URL } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Contact Us – Techpivo",
  description: "Get in touch with Techpivo. Contact our editorial team, advertising department, or send us feedback.",
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: { title: "Contact Us – Techpivo", description: "Get in touch with Techpivo.", url: `${SITE_URL}/contact` },
  twitter: { card: "summary_large_image", title: "Contact Us – Techpivo" },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
