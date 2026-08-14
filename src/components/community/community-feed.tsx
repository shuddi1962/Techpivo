'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { PostCard } from '@/components/community/post-card';
import { FeedSkeleton } from '@/components/community/skeletons';
import { EmptyState } from '@/components/community/empty-state';
import { cn } from '@/lib/utils';
import { type CommunityPost } from '@/lib/community-types';
import { Loader2, Compass, Flame, Clock3, HelpCircle, Trophy, Users, Sparkles, CheckCircle2 } from 'lucide-react';

export type FeedRail = 'for_you' | 'following' | 'trending' | 'latest' | 'unanswered' | 'experts' | 'open' | 'solved';

const RAIL_META: Record<FeedRail, { label: string; icon: typeof Compass }> = {
  for_you: { label: 'For you', icon: Sparkles },
  following: { label: 'Following', icon: Users },
  trending: { label: 'Trending', icon: Flame },
  latest: { label: 'Latest', icon: Clock3 },
  unanswered: { label: 'Unanswered', icon: HelpCircle },
  experts: { label: 'Experts', icon: Trophy },
  open: { label: 'Open', icon: Compass },
  solved: { label: 'Solved', icon: CheckCircle2 },
};

interface FeedResponse {
  items: CommunityPost[];
  next_cursor: string | null;
  has_more: boolean;
  requires_auth?: boolean;
  experts_fallback?: boolean;
}

interface Props {
  rails?: FeedRail[];
  initialRail?: FeedRail;
  className?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function CommunityFeed({ rails = ['for_you', 'trending', 'latest', 'unanswered', 'experts'], initialRail = 'for_you', className, emptyTitle = 'Nothing here yet', emptyDescription = 'Be the first to post something in the community.' }: Props) {
  const [rail, setRail] = useState<FeedRail>(initialRail);
  const [items, setItems] = useState<CommunityPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [error, setError] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);

  const load = useCallback(async (railName: FeedRail, reset: boolean, cursorVal: string | null, quiet = false) => {
    if (busyRef.current) return;
    busyRef.current = true;
    if (reset && !quiet) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ rail: railName, limit: '20' });
      if (cursorVal) params.set('cursor', cursorVal);
      const res = await fetch(`/api/community/feed?${params}`);
      if (!res.ok) throw new Error('feed');
      const d: FeedResponse = await res.json();
      if (d.requires_auth) {
        setRequiresAuth(true);
        setItems([]);
        setHasMore(false);
      } else {
        setRequiresAuth(false);
        setItems(prev => (reset ? d.items : [...prev, ...d.items]));
        setCursor(d.next_cursor);
        setHasMore(d.has_more);
      }
      setError('');
    } catch {
      setError('Could not load the feed.');
    }
    setLoading(false);
    setLoadingMore(false);
    busyRef.current = false;
  }, []);

  useEffect(() => {
    setRail(initialRail);
    void load(initialRail, true, null);
  }, [initialRail, load]);

  useEffect(() => {
    if (!rails.includes(rail) && rail !== 'open' && rail !== 'solved') return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !busyRef.current) {
        void load(rail, false, cursor);
      }
    }, { rootMargin: '600px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [rail, hasMore, cursor, load, rails]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`community_feed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_posts' }, () => void load(rail, true, null, true))
      .subscribe();
    const poll = setInterval(() => void load(rail, true, null, true), 30000);
    const onFocus = () => void load(rail, true, null, true);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(poll);
      window.removeEventListener('focus', onFocus);
      supabase.removeChannel(channel);
    };
  }, [rail, load]);

  const switchRail = (r: FeedRail) => {
    if (r === rail) return;
    setRail(r);
    void load(r, true, null);
  };

  return (
    <div className={className}>
      {/* Rail tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-4 pb-1">
        {rails.map(r => {
          const m = RAIL_META[r];
          const MIcon = m.icon;
          const active = r === rail;
          return (
            <button
              key={r}
              type="button"
              onClick={() => switchRail(r)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium border transition-colors',
                active
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-borderSoft bg-surface text-textSecondary hover:border-brand/40 hover:text-textPrimary'
              )}
            >
              <MIcon className="h-3.5 w-3.5" aria-hidden />
              {m.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <FeedSkeleton count={4} />
      ) : requiresAuth ? (
        <div className="rounded-xl border border-borderSoft bg-surface p-8 text-center">
          <Users className="mx-auto h-6 w-6 text-textSecondary mb-2" aria-hidden />
          <p className="text-sm text-textPrimary font-medium mb-1">The Following feed is for signed-in members</p>
          <p className="text-xs text-textSecondary mb-4">Follow people you learn from and their posts land here.</p>
          <Link href="/account" className="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:opacity-90">
            Sign in / Join
          </Link>
        </div>
      ) : items.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} actionLabel="Create a post" actionHref="/community/create" />
      ) : (
        <div className="space-y-3">
          {items.map(p => (
            <PostCard key={p.id} post={p} />
          ))}
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-textSecondary" aria-hidden />
            </div>
          )}
          {!hasMore && items.length > 0 && (
            <p className="text-center text-xs text-textSecondary py-4">You&apos;re all caught up.</p>
          )}
        </div>
      )}
    </div>
  );
}