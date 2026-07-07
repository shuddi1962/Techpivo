import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Password Generator — Free Online Tool",
  description: "Generate strong, secure passwords instantly. Customizable length, character types, and strength indicator.",
  openGraph: {
    title: "Password Generator — Free Online Tool — TechPivo",
    description: "Generate strong, secure passwords instantly. Customizable length and character types.",
  },
}

export default function PasswordGeneratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
