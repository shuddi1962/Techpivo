'use client';

import Link from 'next/link';
import { TopicChip } from '@/components/community/topic-chip';
import { VoteControl } from '@/components/community/vote-control';
import { CONTENT_TYPE_META, QUESTION_STATUS_META, questionHealthFor, type CommunityPost } from '@/lib/community-types';
import { timeAgo, formatNumber } from '@/lib/community-utils';
import { cn } from '@/lib/utils';
import { MessageSquare, Eye, CircleCheck, Gift, Lock, Pin } from 'lucide-react';

interface Props {
  post: CommunityPost;
  showBody?: boolean;
  className?: string;
  myVote?: 'up' | 'down' | null;
}

const STATUS_TONE: Record<string, string> = {
  muted: 'text-textSecondary',
  info: 'text-info',
  warning: 'text-warning',
  success: 'text-success',
  danger: 'text-danger',
  verified: 'text-verified',
};

export function postHref(post: CommunityPost): string {
  if (post.content_type === 'question') return `/answers/${post.slug ?? post.id}`;
  return `/community/forum/${post.category?.slug ?? 'general'}/${post.id}`;
}

export function PostCard({ post, showBody = false, className, myVote = null }: Props) {
  const meta = CONTENT_TYPE_META[post.content_type];
  const status = questionHealthFor(post);
  const statusMeta = QUESTION_STATUS_META[status];
  const Icon = meta.icon;

  return (
    <article className={cn('group relative border border-borderSoft rounded-xl bg-surface hover:bg-surface-elevated transition-colors overflow-hidden', className)}>
      {post.image_url && (
        <Link href={postHref(post)} className="block relative h-36 sm:h-44 overflow-hidden" tabIndex={-1} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image_url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/10 to-transparent" />
        </Link>
      )}
      <div className="flex gap-3 p-4">
        <VoteControl postId={post.id} initialCount={post.vote_count} initialVote={myVote} size="sm" className="pt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-textSecondary">
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {meta.label}
            </span>
            {statusMeta.tone !== 'muted' && (
              <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium', STATUS_TONE[statusMeta.tone])}>
                <CircleCheck className="h-3 w-3" aria-hidden />
                {statusMeta.label}
              </span>
            )}
            {post.is_solved && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accepted">
                <CircleCheck className="h-3 w-3" aria-hidden />
                Solved
              </span>
            )}
            {post.bounty_points > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning">
                <Gift className="h-3 w-3" aria-hidden />
                {post.bounty_points} rep
              </span>
            )}
            {post.is_pinned && (
              <span className="inline-flex items-center gap-1 text-[11px] text-textSecondary">
                <Pin className="h-3 w-3" aria-hidden />
                Pinned
              </span>
            )}
            {post.is_locked && (
              <span className="inline-flex items-center gap-1 text-[11px] text-textSecondary">
                <Lock className="h-3 w-3" aria-hidden />
                Locked
              </span>
            )}
            <span className="ml-auto text-[11px] text-textSecondary">{timeAgo(post.created_at)}</span>
          </div>

          <h3 className="text-[15px] leading-snug font-semibold text-textPrimary mb-1.5">
            <Link href={postHref(post)} className="hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-sm">
              {post.title}
            </Link>
          </h3>

          {showBody && (
            <p className="text-sm text-textSecondary line-clamp-2 mb-2">{post.excerpt || (post.content || '').replace(/[#*`>\-\[\]()!]/g, '').slice(0, 240)}</p>
          )}

          <div className="flex items-center gap-3 text-[11px] text-textSecondary">
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" aria-hidden />
              {formatNumber(post.reply_count)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3 w-3" aria-hidden />
              {formatNumber(post.view_count)}
            </span>
            {post.author && (
              <Link href={`/u/${post.author.username ?? post.author.id}`} className="hover:text-textPrimary truncate max-w-[180px]">
                {post.author.full_name || post.author.username || 'Anonymous'}
              </Link>
            )}
          </div>

          {(post.topics && post.topics.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {post.topics.slice(0, 4).map(t => (
                <TopicChip key={t.id} topic={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}