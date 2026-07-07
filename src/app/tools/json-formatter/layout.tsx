import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "JSON Formatter — Free Online Tool",
  description: "Format, validate, and beautify JSON data online. Free developer tool with syntax highlighting, error detection, and tree view.",
  openGraph: {
    title: "JSON Formatter — Free Online Tool — TechPivo",
    description: "Format, validate, and beautify JSON data online. Free developer tool.",
  },
}

export default function JsonFormatterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
