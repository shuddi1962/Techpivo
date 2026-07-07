import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Slug Generator — Free Online Tool",
  description: "Convert any text to a clean, SEO-friendly URL slug instantly. Free online slug generator for developers and content creators.",
  openGraph: {
    title: "Slug Generator — Free Online Tool — TechPivo",
    description: "Convert any text to a clean, SEO-friendly URL slug instantly.",
  },
}

export default function SlugGeneratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
