import { CommunityHeader } from '@/components/community/community-header'
import { CommandCenter } from '@/components/community/command-center'

export default function AnswersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-2">
      <CommunityHeader />
      <CommandCenter />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}