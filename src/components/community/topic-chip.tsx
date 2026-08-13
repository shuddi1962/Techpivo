import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { CommunityTopic } from '@/lib/community-types';

interface Props {
  topic: Pick<CommunityTopic, 'slug' | 'name'>;
  size?: 'sm' | 'md';
  className?: string;
}

export function TopicChip({ topic, size = 'sm', className }: Props) {
  return (
    <Link
      href={`/community/topics/${topic.slug}`}
      className={cn(
        'inline-flex items-center rounded-full border border-borderSoft bg-surface-2 text-textSecondary hover:text-textPrimary hover:border-textPrimary/30 hover:bg-surface transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      <span aria-hidden className="mr-1 text-textSecondary/70">#</span>
      {topic.name}
    </Link>
  );
}