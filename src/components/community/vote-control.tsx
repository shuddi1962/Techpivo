'use client';

import { useState } from 'react';
import { ArrowBigUp, ArrowBigDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  postId?: string;
  replyId?: string;
  initialCount: number;
  initialVote?: 'up' | 'down' | null;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Compact vertical vote control for posts and answers.
 * Optimistic with rollback; server is authoritative.
 */
export function VoteControl({ postId, replyId, initialCount, initialVote = null, size = 'md', className }: Props) {
  const [count, setCount] = useState(initialCount);
  const [vote, setVote] = useState<'up' | 'down' | null>(initialVote);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cast = async (next: 'up' | 'down') => {
    if (busy) return;
    const prev = { count, vote };
    const target = vote === next ? null : next;
    setCount(c => c + (target === null ? (vote === 'up' ? -1 : 1) : target === 'up' ? 1 : -1));
    setVote(target);
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/community/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId ?? null, reply_id: replyId ?? null, vote_type: target }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) throw new Error('sign-in-required');
        throw new Error(data.error || 'Vote failed');
      }
    } catch (e) {
      setCount(prev.count);
      setVote(prev.vote);
      setError((e as Error).message === 'sign-in-required' ? 'Sign in to vote' : 'Could not save vote');
    } finally {
      setBusy(false);
    }
  };

  const btn = (dir: 'up' | 'down') =>
    cn(
      'flex items-center justify-center rounded-md transition-colors disabled:opacity-50',
      size === 'md' ? 'h-8 w-9' : 'h-6 w-7',
      vote === dir
        ? dir === 'up'
          ? 'text-success bg-success/10'
          : 'text-danger bg-danger/10'
        : 'text-textSecondary hover:text-textPrimary hover:bg-surface-2'
    );

  return (
    <div className={cn('flex flex-col items-center gap-0.5 select-none', className)}>
      <button
        type="button"
        aria-label="Upvote"
        aria-pressed={vote === 'up'}
        className={btn('up')}
        disabled={busy}
        onClick={() => cast('up')}
      >
        <ArrowBigUp className={size === 'md' ? 'h-5 w-5' : 'h-4 w-4'} strokeWidth={2} />
      </button>
      <span
        className={cn(
          'font-mono tabular-nums leading-none',
          size === 'md' ? 'text-sm' : 'text-xs',
          count > 0 ? 'text-textPrimary' : 'text-textSecondary'
        )}
        title={`${count} votes`}
      >
        {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
      </span>
      <button
        type="button"
        aria-label="Downvote"
        aria-pressed={vote === 'down'}
        className={btn('down')}
        disabled={busy}
        onClick={() => cast('down')}
      >
        <ArrowBigDown className={size === 'md' ? 'h-5 w-5' : 'h-4 w-4'} strokeWidth={2} />
      </button>
      {error && (
        <span role="alert" className="mt-1 text-[11px] text-danger max-w-[72px] text-center leading-tight">
          {error}
        </span>
      )}
    </div>
  );
}