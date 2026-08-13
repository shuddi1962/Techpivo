import type { Metadata } from "next"
import { CommunityHeader } from '@/components/community/community-header'

export const metadata: Metadata = {
  title: "Community — TechPivo",
  description: "Join the TechPivo community. Ask questions, discuss technology, test your knowledge, and build reputation with fellow tech enthusiasts.",
}

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-2">
      <CommunityHeader />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
