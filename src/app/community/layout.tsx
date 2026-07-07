import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Community — TechPivo",
  description: "Join the TechPivo community. Discuss tech, take quizzes, earn rewards, and connect with fellow technology enthusiasts.",
}

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
