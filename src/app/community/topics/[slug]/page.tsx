'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { PostCard } from '@/components/community/post-card';
import { FeedSkeleton } from '@/components/community/skeletons';
import { EmptyState } from '@/components/community/empty-state';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { type CommunityPost } from '@/lib/community-types';
import { Hash, Loader2, Users, BellPlus, BellOff, ChevronDown } from 'lucide-react';

interface TopicData {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

export default function TopicHubPage() {
  const { slug } = useParams<{ slug: string }>();
  const supabase = createClient();
  const [topic, setTopic] = useState<TopicData | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [myFollow, setMyFollow] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = useCallback(async (reset: boolean, cursor?: string | null) => {
    try {
      const url = `/api/community/topics/${slug}${reset ? '' : cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.status === 404) { setNotFound(true); return; }
      const d = await res.json();
      setTopic(d.topic);
      setFollowerCount(d.follower_count);
      setMyFollow(d.my_follow);
      setHasMore(d.has_more);
      cursorRef.current = d.next_cursor;
      setPosts(prev => (reset ? d.posts : [...prev, ...d.posts]));
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load(true);
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

  if (notFound) {
    return (
      <div className="py-16">
        <EmptyState title="Topic not found" description="This topic doesn't exist or hasn't been approved yet." actionHref="/community/topics" actionLabel="Browse topics" />
      </div>
    );
  }

  return (
    <div>
      {loading && !topic ? (
        <FeedSkeleton />
      ) : topic ? (
          <>
            <div className="rounded-xl border border-borderSoft bg-surface p-5 mb-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                    style={{ background: `${topic.color || '#F59E0B'}22`, color: topic.color || '#F59E0B' }}
                  >
                    {topic.icon || '#'}
                  </span>
                  <div>
                    <h1 className="text-xl font-bold text-textPrimary flex items-center gap-2">
                      <Hash className="h-5 w-5 text-accent" aria-hidden /> {topic.name}
                    </h1>
                    <p className="text-sm text-textSecondary mt-0.5" data-followers>
                      <Users className="inline h-3.5 w-3.5 mr-1" aria-hidden /> {followerCount} following
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleFollow}
                  disabled={following}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50',
                    myFollow ? 'border border-borderSoft bg-surface-elevated text-textPrimary hover:bg-surface-2' : 'bg-accent text-white hover:opacity-90'
                  )}
                >
                  {following ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : myFollow ? <BellOff className="h-4 w-4" aria-hidden /> : <BellPlus className="h-4 w-4" aria-hidden />}
                  {myFollow ? 'Following' : 'Follow'}
                </button>
              </div>
              {topic.description && <p className="mt-3 text-sm text-textSecondary">{topic.description}</p>}
            </div>

            {loading ? (
              <FeedSkeleton />
            ) : posts.length === 0 ? (
              <EmptyState
                title="No posts yet"
                description="Be the first to start a discussion under this topic."
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
                      onClick={() => void load(false, cursorRef.current)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-borderSoft bg-surface px-4 py-2 text-sm font-medium text-textPrimary hover:bg-surface-elevated"
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden /> Load more
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : null}
    </div>
  );
}