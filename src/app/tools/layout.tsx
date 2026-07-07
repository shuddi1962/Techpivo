import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Free Tech Tools",
  description: "Free online developer tools, SEO tools, AI writing tools, and utilities — JSON formatter, password generator, slug generator, word counter, and more.",
  openGraph: {
    title: "Free Tech Tools — TechPivo",
    description: "Free online developer tools, SEO tools, AI writing tools, and utilities.",
  },
}

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
