'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { VoteControl } from '@/components/community/vote-control';
import { TopicChip } from '@/components/community/topic-chip';
import { CommunityMarkdown } from '@/components/community/community-markdown';
import { PollWidget } from '@/components/community/poll-widget';
import { ShareMenu } from '@/components/community/share-menu';
import { CONTENT_TYPE_META, QUESTION_STATUS_META, questionHealthFor, type CommunityPost, type CommunityReply } from '@/lib/community-types';
import { timeAgo, formatNumber, shouldCountView, parseTags } from '@/lib/community-utils';
import { cn } from '@/lib/utils';
import {
  Bookmark, BookmarkCheck, CalendarDays, CheckCircle2, CircleCheck, Clock, Eye,
  Gift, Loader2, Lock, MessageSquare, Mic, Pin, Rocket, Scale, Send, Users,
} from 'lucide-react';

interface DetailResponse {
  post: CommunityPost;
  replies: CommunityReply[];
  my_votes?: { target_id: string; vote: string }[];
  error?: string;
  redirect?: string;
}

interface QuizRow {
  id: string;
  title: string;
  community_post_id: string | null;
  question_count: number;
  difficulty: string | null;
  image_url: string | null;
}

const STATUS_TONE: Record<string, string> = {
  muted: 'text-textSecondary',
  info: 'text-info',
  warning: 'text-warning',
  success: 'text-success',
  danger: 'text-danger',
  verified: 'text-verified',
};

function formatDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ForumPostPage({ params }: { params: { category: string; id: string } }) {
  const router = useRouter();
  const postId = params.id;

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, 'up' | 'down'>>({});
  const [quiz, setQuiz] = useState<QuizRow | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [error, setError] = useState('');
  const countViewRef = useRef(shouldCountView(postId));
  const busyRef = useRef(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const params = new URLSearchParams();
      if (countViewRef.current) params.set('count_view', '1');
      const res = await fetch(`/api/community/discussions/${encodeURIComponent(postId)}${params.size ? `?${params}` : ''}`);
      const d = await res.json();
      if (d.redirect) { router.replace(d.redirect); return; }
      if (!res.ok || !d.post) {
        setError(d.error || 'Post not found.');
        setLoading(false);
        return;
      }
      countViewRef.current = false;
      setPost(prev => (quiet ? d.post : d.post));
      setReplies(d.replies || []);
      if (d.my_votes) {
        setMyVotes(Object.fromEntries(d.my_votes.map((v: { target_id: string; vote: string }) => [v.target_id, v.vote as 'up' | 'down'])));
      }
      setError('');
    } catch {
      if (!quiet) setError('Failed to load post.');
    }
    setLoading(false);
    busyRef.current = false;
  }, [postId, router]);

  useEffect(() => { void load(); }, [load]);

  // Realtime: new replies + post updates (votes, status) appear live.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`forum_detail_${postId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_replies', filter: `post_id=eq.${postId}` }, () => void load(true))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'forum_posts', filter: `id=eq.${postId}` }, () => void load(true))
      .subscribe();
    channelRef.current = channel;
    const pollTimer = setInterval(() => void load(true), 30000);
    const onFocus = () => void load(true);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(pollTimer);
      window.removeEventListener('focus', onFocus);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [postId, load]);

  // Canonical URL: this page can be reached via /community/forum/<cat>/<id> or
  // (for questions) /answers/<slug>; always point search engines at one URL.
  useEffect(() => {
    const canonical = `${window.location.origin}/community/forum/${params.category}/${postId}`;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canonical;
    return () => {
      link?.remove();
    };
  }, [params.category, postId]);

  // Quiz linked to this post (created via composer with community_post_id)
  useEffect(() => {
    if (!post || post.content_type !== 'quiz') return;
    fetch('/api/community/quiz')
      .then(r => r.json())
      .then(d => {
        const rows: QuizRow[] = d.quizzes || [];
        const hit = rows.find(q => q.community_post_id === post.id) ?? null;
        setQuiz(hit);
      })
      .catch(() => {});
  }, [post]);

  const meta = post ? CONTENT_TYPE_META[post.content_type] : null;
  const Icon = meta?.icon;
  const status = useMemo(() => (post ? questionHealthFor(post) : 'new'), [post]);
  const statusMeta = post ? QUESTION_STATUS_META[status] : null;
  const typeMeta = post?.meta ?? {};

  const toggleSave = async () => {
    if (!post || saveBusy) return;
    setSaveBusy(true);
    try {
      const method = saved ? 'DELETE' : 'POST';
      const res = await fetch('/api/community/bookmarks', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: 'forum_post',
          item_id: post.id,
          title: post.title,
          url: `/community/forum/${post.category?.slug || 'general'}/${post.id}`,
        }),
      });
      if (res.ok) setSaved(!saved);
    } catch { /* keep state */ }
    setSaveBusy(false);
  };

  const submitReply = async () => {
    if (!replyContent.trim() || !post || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/community/discussions/${post.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent.trim() }),
      });
      const data = await res.json();
      if (data.reply) {
        setReplies(prev => [...prev, data.reply]);
        setReplyContent('');
        if (post.reply_count !== undefined) setPost({ ...post, reply_count: post.reply_count + 1 });
      } else {
        setError(data.error || 'Failed to post reply.');
      }
    } catch {
      setError('Network error — try again.');
    }
    setSubmitting(false);
  };

  const saveBookmarksCheck = useCallback(async () => {
    try {
      const res = await fetch('/api/community/bookmarks');
      const d = await res.json();
      if (Array.isArray(d.bookmarks)) {
        setSaved(d.bookmarks.some((b: { item_type: string; item_id: string }) => b.item_type === 'forum_post' && b.item_id === postId));
      }
    } catch { /* ignore */ }
  }, [postId]);

  useEffect(() => { void saveBookmarksCheck(); }, [saveBookmarksCheck]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">
        <div className="h-6 w-1/2 rounded bg-surface-2 animate-pulse" />
        <div className="h-40 rounded-xl bg-surface-2 animate-pulse" />
        <div className="h-24 rounded-xl bg-surface-2 animate-pulse" />
        <div className="h-24 rounded-xl bg-surface-2 animate-pulse" />
      </div>
    );
  }

  if (!post || error) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <CircleCheck className="mx-auto h-8 w-8 text-warning mb-3" aria-hidden />
        <h1 className="text-lg font-semibold text-textPrimary">Post not found</h1>
        <p className="text-sm text-textSecondary mt-1 mb-5">{error || 'It may have been removed or unpublished.'}</p>
        <Link href="/community/forum" className="text-sm font-medium text-brand hover:underline">Back to Forum</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href={`/community/forum/${post.category?.slug || 'general'}`} className="inline-flex items-center gap-1.5 text-sm text-textSecondary hover:text-textPrimary mb-4">
        ← {post.category?.name || 'Forum'}
      </Link>

      {/* Post */}
      <article className="rounded-2xl border border-borderSoft bg-surface">
        {post.image_url && (
        <div className="relative h-52 sm:h-64 overflow-hidden rounded-t-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/10 to-transparent" />
          </div>
        )}
        <div className="p-5 sm:p-6">
          <div className="flex gap-4">
            <div className="hidden sm:block shrink-0">
              <VoteControl postId={post.id} initialCount={post.vote_count} initialVote={myVotes[post.id] ?? null} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {Icon && <Icon className="h-4 w-4 text-brand" aria-hidden />}
                <span className="text-[11px] font-semibold uppercase tracking-wide text-textSecondary">{meta?.label}</span>
                {statusMeta && statusMeta.tone !== 'muted' && (
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', statusMeta.tone === 'success' ? 'bg-success/10 text-success' : statusMeta.tone === 'danger' ? 'bg-danger/10 text-danger' : statusMeta.tone === 'warning' ? 'bg-warning/10 text-warning' : statusMeta.tone === 'info' ? 'bg-info/10 text-info' : statusMeta.tone === 'verified' ? 'bg-verified/10 text-verified' : 'bg-surface-2 text-textSecondary')}>
                    {statusMeta.label}
                  </span>
                )}
                {post.is_solved && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                    <CheckCircle2 className="h-3 w-3" aria-hidden /> Solved
                  </span>
                )}
                {post.is_pinned && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-textSecondary"><Pin className="h-3 w-3" aria-hidden /> Pinned</span>
                )}
                {post.is_locked && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-textSecondary"><Lock className="h-3 w-3" aria-hidden /> Locked</span>
                )}
                {post.bounty_points > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                    <Gift className="h-3 w-3" aria-hidden /> +{post.bounty_points} bounty
                  </span>
                )}
                <span className="ml-auto text-xs text-textSecondary flex items-center gap-3">
                  <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" aria-hidden /> {formatNumber(post.view_count)}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" aria-hidden /> {formatNumber(post.reply_count)}</span>
                  <ShareMenu title={post.title} buttonClassName="text-xs" />
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-textPrimary font-[family-name:var(--font-syne)] leading-snug">{post.title}</h1>

              <div className="flex items-center gap-2 mt-3 text-sm text-textSecondary">
                <Link href={`/u/${post.author?.username ?? post.author_id}`} className="flex items-center gap-2 min-w-0">
                  {post.author?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.author.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                      {(post.author?.full_name || post.author?.username || '?')[0]}
                    </span>
                  )}
                  <span className="truncate font-medium text-textPrimary hover:text-brand">{post.author?.full_name || post.author?.username || 'Member'}</span>
                </Link>
                <span className="text-xs">Lv.{post.author?.level ?? 1}</span>
                <span aria-hidden>·</span>
                <span className="text-xs">{timeAgo(post.created_at)}</span>
              </div>

              {post.content && (
                <div className="mt-4 text-[15px] leading-relaxed text-textPrimary">
                  <CommunityMarkdown content={post.content} />
                </div>
              )}

              {/* ── Type-specific content ─────────────────────────── */}
              {post.content_type === 'poll' && (
                <div className="mt-5">
                  <PollWidget postId={post.id} />
                </div>
              )}

              {post.content_type === 'quiz' && quiz && (
                <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-borderSoft bg-surface-2/60 p-4">
                  {quiz.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={quiz.image_url} alt="" className="h-20 w-full sm:w-32 rounded-lg object-cover" />
                  ) : (
                    <span className="hidden sm:flex h-20 w-32 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <Rocket className="h-7 w-7" aria-hidden />
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-textPrimary">Quiz: {quiz.title}</p>
                    <p className="text-xs text-textSecondary mt-0.5">
                      {quiz.question_count} questions · {quiz.difficulty ? String(quiz.difficulty).charAt(0).toUpperCase() + String(quiz.difficulty).slice(1) : 'Mixed'} difficulty
                    </p>
                  </div>
                  <Link
                    href={`/community/quiz/${quiz.id}`}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Take the quiz
                  </Link>
                </div>
              )}

              {post.content_type === 'ama' && (
                <div className="mt-5 rounded-xl border border-borderSoft bg-surface-2/60 p-4 grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Mic className="h-4 w-4 mt-0.5 text-brand shrink-0" aria-hidden />
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-textSecondary">Host</p>
                      <p className="font-medium text-textPrimary">{String(typeMeta.host || 'Community')}</p>
                    </div>
                  </div>
                  {Array.isArray(typeMeta.guests) && typeMeta.guests.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Users className="h-4 w-4 mt-0.5 text-brand shrink-0" aria-hidden />
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-textSecondary">Guests</p>
                        <p className="font-medium text-textPrimary">{Array.isArray(typeMeta.guests) ? typeMeta.guests.map(g => String(g)).join(', ') : ''}</p>
                      </div>
                    </div>
                  )}
                  {Boolean(typeMeta.start_at || typeMeta.end_at) && (
                    <div className="flex items-start gap-2 sm:col-span-2">
                      <CalendarDays className="h-4 w-4 mt-0.5 text-brand shrink-0" aria-hidden />
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-textSecondary">Schedule</p>
                        <p className="font-medium text-textPrimary">
                          {formatDateTime(String(typeMeta.start_at ?? '')) || 'Flexible'} {typeMeta.end_at ? `→ ${formatDateTime(String(typeMeta.end_at))}` : ''}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {post.content_type === 'showcase' && (
                <div className="mt-5 rounded-xl border border-borderSoft bg-surface-2/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {Boolean(typeMeta.demo_url) && (
                      <a href={String(typeMeta.demo_url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                        <Rocket className="h-3.5 w-3.5" aria-hidden /> Live demo
                      </a>
                    )}
                    {Boolean(typeMeta.repo_url) && (
                      <a href={String(typeMeta.repo_url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-borderSoft bg-surface px-3.5 py-1.5 text-xs font-semibold text-textPrimary hover:border-brand/50">
                        View source
                      </a>
                    )}
                    {Boolean(typeMeta.feedback_mode) && (
                      <span className="rounded-full bg-info/10 px-2.5 py-1 text-[11px] font-medium text-info">
                        Feedback: {String(typeMeta.feedback_mode).replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  {Array.isArray(typeMeta.tech_stack) && typeMeta.tech_stack.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {typeMeta.tech_stack.map((s: unknown, i: number) => (
                        <span key={i} className="rounded-full bg-surface-2 border border-borderSoft px-2 py-0.5 text-[11px] text-textSecondary">{String(s)}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {post.content_type === 'debate' && Boolean(typeMeta.position_for || typeMeta.position_against) && (
                <div className="mt-5 grid sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-success/30 bg-success/5 p-4">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-success mb-1.5">
                      <Scale className="h-3.5 w-3.5" aria-hidden /> For
                    </p>
                    <p className="text-sm text-textPrimary">{String(typeMeta.position_for)}</p>
                  </div>
                  <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-danger mb-1.5">
                      <Scale className="h-3.5 w-3.5" aria-hidden /> Against
                    </p>
                    <p className="text-sm text-textPrimary">{String(typeMeta.position_against)}</p>
                  </div>
                </div>
              )}

              {(post.tags?.length > 0 || post.category) && (
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  {post.category && (
                    <Link href={`/community/forum/${post.category.slug}`} className="text-xs text-textSecondary hover:text-brand">
                      in {post.category.name}
                    </Link>
                  )}
                  {parseTags(post.tags).map(t => <TopicChip key={t} topic={{ slug: t, name: t } as never} />)}
                </div>
              )}

              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-borderSoft sm:hidden">
                <VoteControl postId={post.id} initialCount={post.vote_count} initialVote={myVotes[post.id] ?? null} size="sm" />
                <button
                  type="button"
                  onClick={toggleSave}
                  disabled={saveBusy}
                  aria-pressed={saved}
                  className={cn('inline-flex items-center gap-1.5 text-xs font-medium disabled:opacity-50', saved ? 'text-brand' : 'text-textSecondary hover:text-textPrimary')}
                >
                  {saved ? <BookmarkCheck className="h-4 w-4" aria-hidden /> : <Bookmark className="h-4 w-4" aria-hidden />}
                  {saved ? 'Saved' : 'Save'}
                </button>
                <ShareMenu title={post.title} buttonClassName="text-xs" />
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Replies */}
      <section className="mt-8" aria-label="Replies">
        <h2 className="text-base font-bold text-textPrimary font-[family-name:var(--font-syne)] mb-3">
          {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
        </h2>
        {replies.length === 0 ? (
          <div className="rounded-xl border border-borderSoft bg-surface p-8 text-center">
            <MessageSquare className="mx-auto h-6 w-6 text-textSecondary mb-2" aria-hidden />
            <p className="text-sm text-textSecondary">No replies yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {replies.map(r => (
              <article key={r.id} className={cn('rounded-xl border bg-surface p-4 sm:p-5', r.is_accepted ? 'border-success/60 ring-1 ring-success/30' : 'border-borderSoft')}>
                <div className="flex gap-3">
                  <div className="hidden sm:block shrink-0">
                    <VoteControl replyId={r.id} initialCount={r.vote_count} initialVote={myVotes[r.id] ?? null} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Link href={`/u/${r.author?.username ?? r.author_id}`} className="flex items-center gap-2 min-w-0">
                        {r.author?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.author.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-[10px] font-bold text-brand">
                            {(r.author?.full_name || r.author?.username || '?')[0]}
                          </span>
                        )}
                        <span className="truncate text-sm font-medium text-textPrimary hover:text-brand">{r.author?.full_name || r.author?.username || 'Member'}</span>
                      </Link>
                      <span className="text-xs text-textSecondary">Lv.{r.author?.level ?? 1}</span>
                      <span className="text-xs text-textSecondary">{timeAgo(r.created_at)}</span>
                      {r.is_accepted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                          <CheckCircle2 className="h-3 w-3" aria-hidden /> Accepted
                        </span>
                      )}
                      {r.position === 'for' && (
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">For</span>
                      )}
                      {r.position === 'against' && (
                        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">Against</span>
                      )}
                    </div>
                    <div className="text-sm leading-relaxed text-textPrimary">
                      <CommunityMarkdown content={r.content} />
                    </div>
                    <div className="flex items-center gap-3 mt-3 sm:hidden">
                      <VoteControl replyId={r.id} initialCount={r.vote_count} initialVote={myVotes[r.id] ?? null} size="sm" />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Reply form */}
      <div className="mt-8 rounded-xl border border-borderSoft bg-surface p-5">
        <h2 className="text-base font-bold text-textPrimary font-[family-name:var(--font-syne)] mb-3">Post a reply</h2>
        <textarea
          value={replyContent}
          onChange={e => setReplyContent(e.target.value)}
          placeholder="Share your thoughts, answer, or add helpful context..."
          rows={4}
          maxLength={20000}
          className="w-full rounded-lg border border-borderSoft bg-surface-2 px-3 py-2.5 text-sm text-textPrimary placeholder:text-textSecondary/60 focus:outline-none focus:ring-2 focus:ring-brand/40 resize-y"
        />
        <div className="flex items-center justify-between mt-3 gap-3">
          <p className="text-xs text-textSecondary flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" aria-hidden /> Replies appear in real time</p>
          <button
            type="button"
            onClick={submitReply}
            disabled={submitting || replyContent.trim().length < 2}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            {submitting ? 'Posting…' : 'Post reply'}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </div>
    </div>
  );
}
