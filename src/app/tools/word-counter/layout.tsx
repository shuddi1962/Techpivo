import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Word Counter — Free Online Tool",
  description: "Count words, characters, sentences, and paragraphs online. Free writing analysis tool with reading time estimation.",
  openGraph: {
    title: "Word Counter — Free Online Tool — TechPivo",
    description: "Count words, characters, sentences, and paragraphs online. Free writing analysis tool.",
  },
}

export default function WordCounterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
