'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
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
  const busyRef = useRef(false);

  // Realtime vote-count sync. The vote RPCs (update_post_vote_count /
  // update_reply_vote_count) rewrite vote_count on the post/reply row, which is
  // publicly readable — UPDATE events broadcast to everyone, so counts stay live
  // across feed, hub, search, detail and answer pages. (forum_votes has owner-only
  // RLS, so its own realtime can never carry other users' votes.)
  useEffect(() => {
    const id = postId || replyId;
    if (!id) return;
    const table = postId ? 'forum_posts' : 'forum_replies';
    const supabase = createClient();
    const channel = supabase
      .channel(`votes_${table}_${id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter: `id=eq.${id}` }, () => {
        void (async () => {
          try {
            const { data } = await supabase.from(table).select('vote_count').eq('id', id).maybeSingle();
            // Apply-time guard: a refetch that STARTED before the user's own cast
            // could resolve AFTER the optimistic update with the pre-vote value —
            // discard any result while a cast is in flight (the cast's own
            // response is authoritative).
            if (busyRef.current) return;
            if (typeof data?.vote_count === 'number') setCount(data.vote_count);
          } catch {
            // ignore
          }
        })();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, replyId]);

  const cast = async (next: 'up' | 'down') => {
    if (busy) return;
    const prev = { count, vote };
    const target = vote === next ? null : next;
    setCount(c => c + (target === null ? (vote === 'up' ? -1 : 1) : target === 'up' ? 1 : -1));
    setVote(target);
    setError(null);
    setBusy(true);
    busyRef.current = true;
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
      const data = await res.json().catch(() => ({}));
      if (typeof data.vote_count === 'number') setCount(data.vote_count);
    } catch (e) {
      // The request failed — but the vote may still have committed server-side
      // (connection drop after commit), so don't blind-rollback. Reconcile from
      // the authoritative row instead; the realtime subscription keeps it live.
      setVote(prev.vote);
      const msg = (e as Error).message;
      setError(msg === 'sign-in-required' ? 'Sign in to vote' : msg === 'Vote failed' || msg === 'Failed to fetch' ? 'Could not save vote' : msg);
      busyRef.current = false;
      try {
        const supabase = createClient();
        const table = postId ? 'forum_posts' : 'forum_replies';
        const id = postId || replyId;
        const { data } = await supabase.from(table).select('vote_count').eq('id', id).maybeSingle();
        if (typeof data?.vote_count === 'number') setCount(data.vote_count);
        else setCount(prev.count);
      } catch {
        setCount(prev.count);
      }
    } finally {
      setBusy(false);
      busyRef.current = false;
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