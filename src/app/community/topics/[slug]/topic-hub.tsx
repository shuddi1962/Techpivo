'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { PostCard } from '@/components/community/post-card';
import { EmptyState } from '@/components/community/empty-state';
import { CommunityHero } from '@/components/community/community-hero';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { type CommunityPost } from '@/lib/community-types';
import { Loader2, BellPlus, BellOff, ChevronDown, Sparkles, FileText, Users, PenLine, Hash } from 'lucide-react';

interface TopicShape {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

export function TopicHub({
  slug,
  initialTopic,
  initialPosts,
  initialFollowerCount,
  initialPostCount,
  initialHasMore,
  initialNextCursor,
  initialMyFollow,
}: {
  slug: string;
  initialTopic: TopicShape;
  initialPosts: CommunityPost[];
  initialFollowerCount: number;
  initialPostCount: number;
  initialHasMore: boolean;
  initialNextCursor: string | null;
  initialMyFollow: boolean;
}) {
  const supabase = createClient();
  const [topic] = useState<TopicShape>(initialTopic);
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [postCount, setPostCount] = useState(initialPostCount);
  const [myFollow, setMyFollow] = useState(initialMyFollow);
  const [following, setFollowing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const cursorRef = useRef<string | null>(initialNextCursor);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = useCallback(async (reset: boolean, cursor?: string | null) => {
    try {
      const url = `/api/community/topics/${slug}${reset ? '' : cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      const d = await res.json();
      if (reset) {
        setFollowerCount(d.follower_count);
        if (d.post_count !== undefined) setPostCount(d.post_count);
        setMyFollow(d.my_follow);
      }
      setHasMore(d.has_more);
      cursorRef.current = d.next_cursor;
      setPosts(prev => (reset ? d.posts : [...prev, ...d.posts]));
    } catch {
      // keep existing
    } finally {
      setLoadingMore(false);
    }
  }, [slug]);

  useEffect(() => {
    const channel = supabase
      .channel(`topic_${slug}_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_posts' }, () => load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_topics' }, () => load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'topic_follows' }, () => void load(true))
      .subscribe();
    channelRef.current = channel;
    const poll = setInterval(() => void load(true), 30000);
    const onFocus = () => void load(true);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(poll);
      window.removeEventListener('focus', onFocus);
      supabase.removeChannel(channelRef.current!);
    };
  }, [slug, supabase, load]);

  const toggleFollow = async () => {
    setFollowing(true);
    try {
      const res = await fetch(`/api/community/topics/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: myFollow ? 'unfollow' : 'follow' }),
      });
      const d = await res.json();
      if (res.ok) {
        setMyFollow(d.my_follow);
        setFollowerCount(d.follower_count);
      }
    } catch {
      // ignore
    }
    setFollowing(false);
  };

  return (
    <div>
      <CommunityHero
        badge="Topic"
        title={`#${topic.name}`}
        subtitle={topic.description || undefined}
        icon={<span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full text-[13px] leading-none" style={{ color: topic.color || '#FBBF24' }}>{topic.icon || <Sparkles className="h-3.5 w-3.5" />}</span>}
        backHref="/community/topics"
        backLabel="All topics"
        imageUrl={null}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/community/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 transition-colors hover:bg-white/90"
          >
            <PenLine className="h-4 w-4" aria-hidden /> New post
          </Link>
          <button
            type="button"
            onClick={toggleFollow}
            disabled={following}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50',
              myFollow ? 'border border-white/20 bg-white/10 text-white hover:bg-white/15' : 'border border-white/25 bg-white/5 text-white hover:bg-white/15'
            )}
          >
            {following ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : myFollow ? <BellOff className="h-4 w-4" aria-hidden /> : <BellPlus className="h-4 w-4" aria-hidden />}
            {myFollow ? 'Following' : 'Follow'}
          </button>
        </div>
      </CommunityHero>

      {/* Stats strip */}
      <div className="mx-auto max-w-3xl px-4">
        <div className="-mt-4 flex items-center gap-2 rounded-xl border border-borderSoft bg-surface p-3 shadow-sm">
          <div className="flex flex-1 items-center justify-center gap-1.5 text-sm text-textPrimary">
            <FileText className="h-4 w-4 text-brand" aria-hidden />
            <strong className="tabular-nums">{postCount}</strong>
            <span className="text-textSecondary">{postCount === 1 ? 'post' : 'posts'}</span>
          </div>
          <div className="h-8 w-px bg-borderSoft" aria-hidden />
          <div className="flex flex-1 items-center justify-center gap-1.5 text-sm text-textPrimary">
            <Users className="h-4 w-4 text-brand" aria-hidden />
            <strong className="tabular-nums">{followerCount}</strong>
            <span className="text-textSecondary">{followerCount === 1 ? 'follower' : 'followers'}</span>
          </div>
          <div className="h-8 w-px bg-borderSoft" aria-hidden />
          <div className="flex flex-1 items-center justify-center gap-1.5 text-sm text-textPrimary">
            <Hash className="h-4 w-4 text-brand" aria-hidden />
            <span className="text-textSecondary">#{topic.slug}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-textPrimary font-[family-name:var(--font-syne)]">Discussions</h2>
          <span className="text-xs text-textSecondary">Live · refreshes automatically</span>
        </div>

        {posts.length === 0 ? (
          <EmptyState
            title="No posts yet"
            description={`Be the first to start a discussion under #${topic.name}.`}
            actionHref="/community/create"
            actionLabel="Create a post"
          />
        ) : (
          <>
            <div className="space-y-3">
              {posts.map(p => <PostCard key={p.id} post={p} showBody={false} />)}
            </div>
            {hasMore && (
              <div className="mt-5 text-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => { setLoadingMore(true); void load(false, cursorRef.current); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-borderSoft bg-surface px-4 py-2 text-sm font-medium text-textPrimary hover:bg-surface-elevated disabled:opacity-60"
                >
                  {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
