'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Pin, CheckCircle2, Eye, ThumbsUp, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ForumCategoriesSidebar } from '@/components/community/forum-categories-sidebar';
import { timeAgo } from '@/lib/community-utils';
import type { ForumCategory } from '@/lib/community';

interface ForumItem {
  id: string;
  title: string;
  created_at: string;
  is_pinned: boolean | null;
  is_solved: boolean | null;
  vote_count: number | null;
  reply_count: number | null;
  view_count: number | null;
  author?: { full_name?: string | null; username?: string | null; level?: number | null } | null;
  category?: { name?: string | null; slug?: string | null; icon?: string | null; image_url?: string | null } | null;
}

const AVATAR_COLORS = [
  'from-blue-500 to-cyan-500',
  'from-violet-500 to-purple-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-500',
  'from-pink-500 to-rose-500',
];

export function ForumListing({ categorySlug }: { categorySlug?: string }) {
  const [posts, setPosts] = useState<ForumItem[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const busyRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (busyRef.current) return;
    busyRef.current = true;
    if (!quiet) setLoading(true);
    try {
      const [postsRes, catsRes] = await Promise.all([
        fetch(`/api/community/feed?rail=latest&limit=15${categorySlug ? `&category=${encodeURIComponent(categorySlug)}` : ''}`, { cache: 'no-store' }),
        fetch('/api/community/discussions', { cache: 'no-store' }),
      ]);
      const [pd, cd] = await Promise.all([postsRes.json(), catsRes.json()]);
      setPosts(pd.items || []);
      setCategories(cd.categories || []);
    } catch {
      // keep existing
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, [categorySlug]);

  useEffect(() => {
    void load();
    pollRef.current = setInterval(() => void load(true), 30000);
    const onFocus = () => void load(true);
    window.addEventListener('focus', onFocus);

    const supabase = createClient();
    const channel = supabase
      .channel(`forum_listing_${categorySlug ?? 'all'}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_posts' }, () => {
        void load(true);
      })
      .subscribe();
    channelRef.current = channel;

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      window.removeEventListener('focus', onFocus);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [load]);

  return (
    <div className="grid lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <ForumCategoriesSidebar categories={categories} activeSlug={categorySlug} />
      </div>

      <div className="lg:col-span-3 space-y-3">
        {loading ? (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-surface-2 animate-pulse" />
            ))}
          </>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-borderSoft bg-surface p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-textSecondary/50" />
            <h3 className="text-lg font-semibold mb-2">No Discussions Yet</h3>
            <p className="text-textSecondary mb-4">
              {categorySlug ? 'Start the first conversation in this category.' : 'Be the first to start a conversation.'}
            </p>
            <Link
              href="/community/forum/new"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Start Discussion
            </Link>
          </div>
        ) : (
          posts.map((post) => {
            const avatarLetter = post.author?.full_name?.[0] || post.author?.username?.[0] || '?';
            const colorIndex = avatarLetter.charCodeAt(0) % AVATAR_COLORS.length;
            return (
              <Link
                key={post.id}
                href={`/community/forum/${post.category?.slug || 'general'}/${post.id}`}
                className="group block rounded-2xl border border-borderSoft bg-surface hover:shadow-lg hover:border-brand/30 transition-all duration-300 overflow-hidden"
              >
                <div className="p-4 md:p-5">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${AVATAR_COLORS[colorIndex]} flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm`}>
                      {avatarLetter}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {post.is_pinned && <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                        {post.is_solved && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                        <h3 className="font-semibold truncate group-hover:text-brand transition-colors">{post.title}</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-textSecondary">
                        <span>{post.author?.full_name || post.author?.username || 'Anonymous'}</span>
                        <span className="text-textSecondary/40">·</span>
                        <span className="flex items-center gap-1.5">
                          {post.category?.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={post.category.image_url} alt="" loading="lazy" className="w-4 h-4 rounded object-cover" />
                          ) : (
                            post.category?.icon
                          )}
                          {post.category?.name}
                        </span>
                        <span className="text-textSecondary/40">·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {timeAgo(post.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2.5 text-xs text-textSecondary">
                        <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {post.vote_count ?? 0}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {post.reply_count ?? 0}</span>
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {post.view_count ?? 0}</span>
                      </div>
                    </div>
                    {post.author?.level ? (
                      <span className="hidden sm:inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-brand/10 text-brand shrink-0">
                        Lv.{post.author.level}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
