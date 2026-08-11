import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Free Tech Tools & Utilities",
  description: "50+ free online tools: developer utilities, SEO tools, security checkers, image and PDF tools, calculators, and AI writing tools. Fast, free, and private — everything runs in your browser.",
  openGraph: {
    title: "Free Tech Tools & Utilities — TechPivo",
    description: "50+ free online tools: JSON formatter, regex tester, password generator, image compressor, PDF tools, calculators, and more.",
  },
}

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}