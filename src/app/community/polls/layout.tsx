import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Polls — TechPivo Community",
  description: "Vote on technology topics and see what the community thinks.",
}

export default function PollsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
