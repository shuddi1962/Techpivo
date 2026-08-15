'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getStoredVotes, storeVotes } from '@/lib/poll-votes';
import { BarChart3, CheckCircle2, Loader2 } from 'lucide-react';

interface PollOption {
  id: string;
  text: string;
  vote_count: number;
}

interface Poll {
  id: string;
  title: string;
  description: string | null;
  total_votes: number;
  is_active: boolean;
  image_url: string | null;
  options: PollOption[];
}

/**
 * Live poll embed for a post (fetched by community_post_id).
 * Guests vote via localStorage persistence; signed-in members via the API.
 * Realtime + 15s poll, same pattern as /community/polls.
 */
export function PollWidget({ postId }: { postId: string }) {
  const supabase = createClient();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [votedPolls, setVotedPolls] = useState<Record<string, string>>(() => getStoredVotes());
  const [voteError, setVoteError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = useCallback(async (quiet = false) => {
    try {
      const res = await fetch(`/api/community/polls?post_id=${encodeURIComponent(postId)}`);
      const d = await res.json();
      const p = (d.polls || [])[0] ?? null;
      setPoll(prev => (quiet ? p ?? prev : p));
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`poll_widget_${postId}_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, () => void load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, () => void load(true))
      .subscribe();
    channelRef.current = channel;
    const pollTimer = setInterval(() => void load(true), 15000);
    const onFocus = () => void load(true);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(pollTimer);
      window.removeEventListener('focus', onFocus);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, load, postId]);

  const vote = async (optionId: string) => {
    if (!poll || busyId) return;
    setVoteError(null);
    setBusyId(optionId);
    setVotedPolls(p => {
      const next = { ...p, [poll.id]: optionId };
      storeVotes(next);
      return next;
    });
    const optimistic = (p: Poll | null): Poll | null => (p ? {
      ...p,
      total_votes: p.total_votes + 1,
      options: p.options.map(o => (o.id === optionId ? { ...o, vote_count: o.vote_count + 1 } : o)),
    } : p);
    setPoll(optimistic);
    try {
      const res = await fetch('/api/community/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poll_id: poll.id, option_id: optionId }),
      });
      if (!res.ok) {
        setVotedPolls(prevV => {
          const n = { ...prevV };
          delete n[poll.id];
          storeVotes(n);
          return n;
        });
        setPoll(prevP => prevP && prevP.total_votes > 0
          ? {
              ...prevP,
              total_votes: prevP.total_votes - 1,
              options: prevP.options.map(o => (o.id === optionId ? { ...o, vote_count: Math.max(0, o.vote_count - 1) } : o)),
            }
          : prevP);
        const d = await res.json().catch(() => ({}));
        setVoteError(res.status === 401 ? 'Sign in to vote.' : d.error ? `Vote failed: ${d.error}` : 'Vote failed. Try again.');
      } else {
        void load(true);
      }
    } catch {
      setVoteError('Network error. Try again.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-borderSoft bg-surface p-5 flex items-center justify-center gap-2 text-sm text-textSecondary">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading poll…
      </div>
    );
  }
  if (!poll) return null;

  const hasVoted = !!votedPolls[poll.id];

  return (
    <div className="rounded-xl border border-borderSoft bg-surface p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-textPrimary font-[family-name:var(--font-syne)]">
          <BarChart3 className="h-4 w-4 text-brand" aria-hidden /> {poll.title}
        </h3>
        <Link href="/community/polls" className="text-[11px] font-medium text-brand hover:underline shrink-0">All polls</Link>
      </div>
      {poll.description && <p className="text-xs text-textSecondary mb-4">{poll.description}</p>}

      {voteError && <p className="mb-3 text-xs text-danger">{voteError}</p>}

      <div className="space-y-2">
        {poll.options.map(opt => {
          const pct = poll.total_votes > 0 ? (opt.vote_count / poll.total_votes) * 100 : 0;
          const isSelected = votedPolls[poll.id] === opt.id;
          if (hasVoted) {
            return (
              <div key={opt.id} className="relative">
                <div className="h-10 rounded-lg bg-surface-2 overflow-hidden">
                  <div
                    className={`h-full rounded-lg transition-all duration-700 ease-out ${isSelected ? 'bg-brand/25' : 'bg-surface-2'}`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <div className="absolute inset-0 flex items-center px-3.5 text-[13px]">
                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-brand shrink-0" aria-hidden />}
                  <span className="flex-1 font-medium text-textPrimary truncate">{opt.text}</span>
                  <span className="font-bold text-xs text-textPrimary">{pct.toFixed(0)}%</span>
                  <span className="text-[11px] text-textSecondary ml-2">({opt.vote_count})</span>
                </div>
              </div>
            );
          }
          return (
            <button
              key={opt.id}
              type="button"
              disabled={busyId !== null}
              onClick={() => vote(opt.id)}
              className="w-full text-left px-3.5 py-2.5 rounded-lg border border-borderSoft bg-surface-2/50 hover:border-brand/50 hover:bg-brand/5 transition-colors text-[13px] font-medium text-textPrimary disabled:opacity-60"
            >
              {opt.text}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-textSecondary mt-3">
        {poll.total_votes} {poll.total_votes === 1 ? 'vote' : 'votes'} · updates live
      </p>
    </div>
  );
}
