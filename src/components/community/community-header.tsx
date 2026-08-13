'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutGrid, HelpCircle, MessageSquare, BarChart3, GraduationCap,
  Mic, Rocket, Scale, CalendarDays, Map, Trophy, Plus,
} from 'lucide-react';

const NAV = [
  { href: '/community', label: 'Discover', icon: LayoutGrid },
  { href: '/community/questions', label: 'Questions', icon: HelpCircle },
  { href: '/community/forum', label: 'Discussions', icon: MessageSquare },
  { href: '/community/polls', label: 'Polls', icon: BarChart3 },
  { href: '/community/quiz', label: 'Quizzes', icon: GraduationCap },
  { href: '/community/events', label: 'Events', icon: CalendarDays },
  { href: '/community/learning-paths', label: 'Learn', icon: Map },
  { href: '/community/leaderboard', label: 'Leaderboard', icon: Trophy },
];

export function CommunityHeader({ onOpenComposer }: { onOpenComposer?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="border-b border-borderSoft bg-surface/80 backdrop-blur-sm sticky top-14 z-30">
      <div className="max-w-6xl mx-auto px-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <nav aria-label="Community sections" className="flex items-center gap-1 flex-1 min-w-0">
          {NAV.map(item => {
            const active = pathname === item.href || (item.href !== '/community' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors',
                  active
                    ? 'border-brand text-textPrimary'
                    : 'border-transparent text-textSecondary hover:text-textPrimary'
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Button size="sm" className="shrink-0 ml-2" onClick={onOpenComposer}>
          <Plus className="h-4 w-4 mr-1" aria-hidden />
          Create
        </Button>
      </div>
    </div>
  );
}

export { NAV as COMMUNITY_NAV, Plus as ComposerPlusIcon, Mic as AMAIcon, Rocket as ShowcaseIcon, Scale as DebateIcon };
