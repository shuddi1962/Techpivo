import type { Metadata } from "next"
import { CommandCenter } from '@/components/community/command-center'

export const metadata: Metadata = {
  title: "Community — TechPivo",
  description: "Join the TechPivo community. Ask questions, discuss technology, test your knowledge, and build reputation with fellow tech enthusiasts.",
}

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-2">
      <CommandCenter />
      <main className="w-full">{children}</main>
    </div>
  )
}
