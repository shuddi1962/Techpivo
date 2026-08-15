'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CommunityMarkdown } from '@/components/community/community-markdown';
import { VoteControl } from '@/components/community/vote-control';
import { TopicChip } from '@/components/community/topic-chip';
import { AnswerSkeleton } from '@/components/community/skeletons';
import { CONTENT_TYPE_META, QUESTION_STATUS_META, questionHealthFor, type CommunityPost, type CommunityReply } from '@/lib/community-types';
import { timeAgo, formatNumber, getLevelForXP } from '@/lib/community-utils';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, CircleCheck, Eye, Gift, Loader2, MessageSquare,
  PenLine, Sparkles, TriangleAlert, Send,
} from 'lucide-react';
import { ShareMenu } from '@/components/community/share-menu';

type Sort = 'best' | 'newest' | 'oldest';

interface ApiResponse {
  post: CommunityPost;
  replies: CommunityReply[];
  related: { id: string; title: string; slug: string | null; reply_count: number; vote_count: number; question_status: string; created_at: string }[];
  my_votes: { target_id: string; vote: string }[];
  current_user: { id: string } | null;
}

const STATUS_TONE: Record<string, string> = {
  muted: 'text-textSecondary',
  info: 'text-info',
  warning: 'text-warning',
  success: 'text-success',
  danger: 'text-danger',
  verified: 'text-verified',
};

export default function AnswerPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [sort, setSort] = useState<Sort>('best');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answerContent, setAnswerContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focusReplyId, setFocusReplyId] = useState<string | null>(null);
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const slug = params.slug;
  const answerBoxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/community/answers/${encodeURIComponent(slug)}?sort=${sort}`);
      if (res.status === 301) {
        const d = await res.json();
        if (d.redirect) { router.replace(d.redirect); return; }
      }
      if (!res.ok) {
        setError((await res.json().catch(() => ({}))).error || 'Question not found.');
        setLoading(false);
        return;
      }
      const d: ApiResponse = await res.json();
      setData(d);
      setAiAnswer((d.post.meta?.ai_answer as string | undefined) ?? '');
      setError('');
    } catch {
      setError('Failed to load question.');
    }
    setLoading(false);
  }, [slug, sort, router]);

  useEffect(() => { void load(); }, [load]);

  // Scroll to a focused reply (e.g. ?focus=<id> from notifications)
  useEffect(() => {
    const f = searchParams.get('focus');
    if (f && data) {
      setFocusReplyId(f);
      setTimeout(() => {
        document.getElementById(`reply-${f}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
    }
  }, [searchParams, data]);

  const post = data?.post ?? null;
  const status = useMemo(() => (post ? questionHealthFor(post) : 'new'), [post]);
  const statusMeta = post ? QUESTION_STATUS_META[status] : null;
  const meta = post ? CONTENT_TYPE_META[post.content_type] : null;
  const Icon = meta?.icon;
  const isAuthor = data?.current_user?.id && post ? data.current_user.id === post.author_id : false;
  const answers = data?.replies ?? [];
  const answeredIds = useMemo(() => new Set(data?.my_votes.map(v => v.target_id) ?? []), [data]);
  const accepted = answers.find(r => r.is_accepted);

  const askAI = async () => {
    if (!post || aiLoading) return;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch('/api/community/ai-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id }),
      });
      const d = await res.json();
      if (!res.ok) { setAiError(d.error || 'Could not generate an AI answer. Try again in a moment.'); return; }
      setAiAnswer(d.answer_md);
    } catch {
      setAiError('Failed to get an AI answer. Try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!answerContent.trim() || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/community/answers/${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: answerContent.trim() }),
      });
      const d = await res.json();
      if (!res.ok) {
        if (res.status === 401) setError('Sign in to answer this question.');
        else setError(d.error || 'Failed to post answer.');
        return;
      }
      setAnswerContent('');
      await load();
      setTimeout(() => {
        document.getElementById(`reply-${d.reply?.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    } catch {
      setError('Network error — try again.');
    }
    setSubmitting(false);
  };

  const acceptAnswer = async (replyId: string) => {
    if (!confirm('Accept this answer? The author earns reputation and the question is marked solved.')) return;
    setError('');
    try {
      const res = await fetch(`/api/community/answers/${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply_id: replyId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (res.status === 401) setError('Sign in to accept an answer.');
        else setError(d.error || 'Failed to accept answer.');
        return;
      }
      await load();
    } catch {
      setError('Network error — try again.');
    }
  };

  if (loading) return <AnswerSkeleton />;
  if (!post || error) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <TriangleAlert className="mx-auto h-8 w-8 text-warning mb-3" aria-hidden />
        <h1 className="text-lg font-semibold text-textPrimary">Question not found</h1>
        <p className="text-sm text-textSecondary mt-1 mb-5">{error || 'It may have been removed or unpublished.'}</p>
        <Link href="/community/questions" className="text-sm font-medium text-brand hover:underline">Browse questions</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* JSON-LD QAPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'QAPage',
            mainEntity: {
              '@type': 'Question',
              name: post.title,
              text: post.content || '',
              dateCreated: post.created_at,
              author: { '@type': 'Person', name: post.author?.username || 'Anonymous' },
              acceptedAnswer: accepted ? {
                '@type': 'Answer',
                text: (accepted.content || '').slice(0, 300),
                dateCreated: accepted.created_at,
                upvoteCount: accepted.vote_count,
                author: { '@type': 'Person', name: accepted.author?.username || 'Anonymous' },
              } : undefined,
              suggestedAnswer: answers.filter(r => !r.is_accepted).slice(0, 3).map(r => ({
                '@type': 'Answer',
                text: (r.content || '').slice(0, 300),
                dateCreated: r.created_at,
                upvoteCount: r.vote_count,
                author: { '@type': 'Person', name: r.author?.username || 'Anonymous' },
              })),
            },
          }),
        }}
      />

      {/* Question */}
      <article className="rounded-2xl border border-borderSoft bg-surface p-5 sm:p-6">
        <div className="flex gap-4">
          <div className="hidden sm:block shrink-0">
            <VoteControl postId={post.id} initialCount={post.vote_count} initialVote={answeredIds.has(post.id) ? (data!.my_votes.find(v => v.target_id === post.id)?.vote as 'up' | 'down') || null : null} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {Icon && <Icon className="h-4 w-4 text-brand" aria-hidden />}
              <span className="text-[11px] font-semibold uppercase tracking-wide text-textSecondary">{meta?.label}</span>
              {statusMeta && (
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', statusMeta.tone === 'success' ? 'bg-success/10 text-success' : statusMeta.tone === 'danger' ? 'bg-danger/10 text-danger' : statusMeta.tone === 'warning' ? 'bg-warning/10 text-warning' : statusMeta.tone === 'info' ? 'bg-info/10 text-info' : statusMeta.tone === 'verified' ? 'bg-verified/10 text-verified' : 'bg-surface-2 text-textSecondary')}>
                  {statusMeta.label}
                </span>
              )}
              {post.bounty_points > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                  <Gift className="h-3 w-3" aria-hidden /> +{post.bounty_points} bounty
                </span>
              )}
              <span className="ml-auto text-xs text-textSecondary flex items-center gap-3">
                <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" aria-hidden /> {formatNumber(post.view_count)}</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" aria-hidden /> {formatNumber(answers.length)}</span>
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

            {(post.tags?.length > 0 || post.category) && (
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {post.category && (
                  <Link href={`/community/forum/${post.category.slug}`} className="text-xs text-textSecondary hover:text-brand">
                    in {post.category.name}
                  </Link>
                )}
                {post.tags?.map(t => <TopicChip key={t} topic={{ slug: t, name: t } as never} />)}
              </div>
            )}

            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-borderSoft sm:hidden">
              <VoteControl postId={post.id} initialCount={post.vote_count} size="sm" />
              <ShareMenu title={post.title} buttonClassName="text-xs" />
            </div>
          </div>
        </div>
      </article>

      {/* Health / resurrection panel */}
      {!aiAnswer && (status === 'unanswered' || status === 'new' || status === 'needs_context') ? (
        <div className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <Sparkles className="h-5 w-5 text-warning shrink-0" aria-hidden />
          <div className="flex-1 text-sm text-textPrimary">
            <strong>No answers yet.</strong> {isAuthor ? 'Your question is still open — share it to get help.' : 'Be the first to help this member.'}
          </div>
          {!isAuthor && (
            <button
              type="button"
              onClick={() => answerBoxRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-warning px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              <PenLine className="h-3.5 w-3.5" aria-hidden /> Answer this question
            </button>
          )}
        </div>
) : status === 'stale' && (
        <div className="mt-4 rounded-xl border border-info/30 bg-info/5 p-4 text-sm text-textPrimary">
          <strong className="text-info">This question may need a fresh answer.</strong> Tech changes fast — if you have updated info, add it below.
        </div>
      )}

      {/* AI Answer */}
      {post.content_type === 'question' && (
        <section className="mt-4 rounded-xl border border-brand/20 bg-brand/5 p-4" aria-label="AI answer">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-textPrimary font-[family-name:var(--font-syne)]">
              <Sparkles className="h-4 w-4 text-brand" aria-hidden /> AI Answer
            </h2>
            <button
              type="button"
              onClick={askAI}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              <Loader2 className={cn('h-3.5 w-3.5', aiLoading && 'animate-spin')} aria-hidden />
              {aiLoading ? 'Thinking…' : aiAnswer ? 'Regenerate' : 'Get an AI answer'}
            </button>
          </div>
          {aiError && <p className="mt-2 text-xs text-danger">{aiError}</p>}
          {aiAnswer && (
            <div className="mt-3 border-t border-brand/15 pt-3 text-[15px] leading-relaxed text-textPrimary">
              <CommunityMarkdown content={aiAnswer} />
              <p className="mt-3 text-[11px] text-textSecondary">AI-generated summary grounded in this discussion. Verify important claims before relying on them.</p>
            </div>
          )}
        </section>
      )}

      {/* Answers */}
      <section className="mt-8" aria-label="Answers">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-base font-bold text-textPrimary font-[family-name:var(--font-syne)]">
            {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
          </h2>
          <div className="flex gap-1 rounded-lg border border-borderSoft bg-surface p-0.5">
            {(['best', 'newest', 'oldest'] as Sort[]).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors',
                  sort === s ? 'bg-brand text-white' : 'text-textSecondary hover:text-textPrimary'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {answers.length === 0 && (
          <div className="rounded-xl border border-borderSoft bg-surface p-8 text-center">
            <MessageSquare className="mx-auto h-6 w-6 text-textSecondary mb-2" aria-hidden />
            <p className="text-sm text-textSecondary">Nothing here yet. Share what you know!</p>
          </div>
        )}

        <div className="space-y-4">
          {answers.map(r => (
            <article
              key={r.id}
              id={`reply-${r.id}`}
              className={cn(
                'rounded-xl border bg-surface p-4 sm:p-5 scroll-mt-24',
                r.is_accepted
                  ? 'border-success/60 ring-1 ring-success/30'
                  : 'border-borderSoft'
              )}
            >
              <div className="flex gap-3">
                <div className="hidden sm:block shrink-0">
                  <VoteControl replyId={r.id} initialCount={r.vote_count} initialVote={answeredIds.has(r.id) ? (data!.my_votes.find(v => v.target_id === r.id)?.vote as 'up' | 'down') || null : null} />
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
                        <CircleCheck className="h-3 w-3" aria-hidden /> Accepted answer
                      </span>
                    )}
                  </div>
                  <div className="text-sm leading-relaxed text-textPrimary">
                    <CommunityMarkdown content={r.content} />
                  </div>
                  <div className="flex items-center gap-3 mt-3 sm:hidden">
                    <VoteControl replyId={r.id} initialCount={r.vote_count} size="sm" />
                  </div>
                  {isAuthor && !post.is_solved && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => acceptAnswer(r.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-success/40 bg-success/5 px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/10"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Accept answer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Answer form */}
      <div ref={answerBoxRef} className="mt-8 rounded-xl border border-borderSoft bg-surface p-5">
        <h2 className="text-base font-bold text-textPrimary font-[family-name:var(--font-syne)] mb-3">Your answer</h2>
        <textarea
          value={answerContent}
          onChange={e => setAnswerContent(e.target.value)}
          placeholder="Write a clear, helpful answer. Support claims with links or code where useful."
          rows={5}
          maxLength={20000}
          className="w-full rounded-lg border border-borderSoft bg-surface-2 px-3 py-2.5 text-sm text-textPrimary placeholder:text-textSecondary/60 focus:outline-none focus:ring-2 focus:ring-brand/40 resize-y"
        />
        <div className="flex items-center justify-between mt-3 gap-3">
          <p className="text-xs text-textSecondary">{answerContent.length}/20000</p>
          <button
            type="button"
            onClick={submitAnswer}
            disabled={submitting || answerContent.trim().length < 15}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            {submitting ? 'Posting…' : 'Post answer'}
          </button>
        </div>
      </div>

      {/* Related */}
      {data && data.related.length > 0 && (
        <section className="mt-10" aria-label="Related questions">
          <h2 className="text-base font-bold text-textPrimary font-[family-name:var(--font-syne)] mb-3">Related questions</h2>
          <div className="space-y-2">
            {data.related.map(r => (
              <Link
                key={r.id}
                href={`/answers/${r.slug ?? r.id}`}
                className="flex items-center gap-3 rounded-lg border border-borderSoft bg-surface px-4 py-3 hover:bg-surface-elevated transition-colors"
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-textSecondary" aria-hidden />
                <span className="flex-1 min-w-0 truncate text-sm text-textPrimary">{r.title}</span>
                <span className="text-xs text-textSecondary shrink-0">{r.reply_count} answers</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
