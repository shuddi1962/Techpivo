'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CONTENT_TYPE_META, CONTENT_TYPE_LIST, type CommunityContentType } from '@/lib/community-types';
import { AlertTriangle, CheckCircle2, Loader2, Plus, Trash2, X, Wand2 } from 'lucide-react';

interface DuplicateHit {
  id: string;
  title: string;
  slug: string | null;
  content_type: CommunityContentType;
  similarity: number;
}

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const EXPIRY_DAYS = [1, 3, 7, 30];
const FEEDBACK_MODES = ['bug_reports', 'ux_review', 'security_review', 'performance_review'];

interface QuizQuestionDraft {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  points: number;
}

const EMPTY_QUIZ_Q = (): QuizQuestionDraft => ({
  question: '',
  options: ['', ''],
  correct_index: 0,
  explanation: '',
  points: 1,
});

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = (searchParams.get('type') || 'question') as CommunityContentType;

  const [type, setType] = useState<CommunityContentType>(
    CONTENT_TYPE_LIST.includes(initial) ? initial : 'question'
  );
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [bounty, setBounty] = useState(0);

  const [pollOptions, setPollOptions] = useState(['', '']);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [allowChange, setAllowChange] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [anonymous, setAnonymous] = useState(false);

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionDraft[]>([EMPTY_QUIZ_Q()]);

  const [amaHost, setAmaHost] = useState('');
  const [amaGuests, setAmaGuests] = useState('');
  const [amaStart, setAmaStart] = useState('');
  const [amaEnd, setAmaEnd] = useState('');

  const [demoUrl, setDemoUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [techStack, setTechStack] = useState('');
  const [feedbackMode, setFeedbackMode] = useState('');

  const [positionFor, setPositionFor] = useState('');
  const [positionAgainst, setPositionAgainst] = useState('');

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [duplicates, setDuplicates] = useState<DuplicateHit[]>([]);
  const [improving, setImproving] = useState(false);
  const [improveHint, setImproveHint] = useState('');

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/community?section=forum-categories');
      const d = await res.json();
      setCategories((d.categories || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
    } catch {
      // categories stay empty; API falls back to first category
    }
  };

  const updatePollOption = (i: number, v: string) =>
    setPollOptions(prev => prev.map((o, idx) => (idx === i ? v : o)));
  const addPollOption = () => setPollOptions(prev => [...prev, '']);
  const removePollOption = (i: number) =>
    setPollOptions(prev => prev.filter((_, idx) => idx !== i));

  const updateQuizQ = (i: number, patch: Partial<QuizQuestionDraft>) =>
    setQuizQuestions(prev => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const addQuizQ = () => setQuizQuestions(prev => [...prev, EMPTY_QUIZ_Q()]);
  const removeQuizQ = (i: number) => setQuizQuestions(prev => prev.filter((_, idx) => idx !== i));
  const updateQuizOpt = (qi: number, oi: number, v: string) =>
    setQuizQuestions(prev => prev.map((q, idx) => idx === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? v : o)) } : q));
  const addQuizOpt = (qi: number) =>
    setQuizQuestions(prev => prev.map((q, idx) => idx === qi ? { ...q, options: [...q.options, ''] } : q));
  const removeQuizOpt = (qi: number, oi: number) =>
    setQuizQuestions(prev => prev.map((q, idx) => idx === qi ? { ...q, options: q.options.filter((_, j) => j !== oi) } : q));

  const submit = async () => {
    setError('');
    setDuplicates([]);
    if (title.trim().length < 5) { setError('Title must be at least 5 characters.'); return; }
    if (type !== 'poll' && type !== 'quiz' && content.trim().length < 15) {
      setError('Please add at least 15 characters of detail.');
      return;
    }

    const payload: Record<string, unknown> = {
      content_type: type,
      title: title.trim(),
      content: content.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      category_id: categoryId || undefined,
    };

    if (type === 'question') {
      payload.difficulty = difficulty;
      payload.bounty_points = bounty;
    }

    if (type === 'poll') {
      const options = pollOptions.map(o => o.trim()).filter(Boolean);
      if (options.length < 2) { setError('Polls need at least 2 options.'); return; }
      payload.options = options;
      payload.expires_in_days = expiresInDays;
      payload.allow_change = allowChange;
      payload.allow_multiple = allowMultiple;
      payload.is_anonymous = anonymous;
    }

    if (type === 'quiz') {
      for (const q of quizQuestions) {
        if (q.question.trim().length < 3) { setError('Every quiz question needs a prompt.'); return; }
        if (q.options.length < 2 || q.options.some(o => !o.trim())) { setError('Every quiz question needs at least 2 filled options.'); return; }
      }
      payload.questions = quizQuestions.map(q => ({
        question: q.question.trim(),
        options: q.options.map(o => o.trim()).filter(Boolean),
        correct_index: q.correct_index,
        explanation: q.explanation.trim() || undefined,
        points: Math.min(10, Math.max(1, q.points)),
      }));
    }

    if (type === 'ama') {
      payload.host = amaHost || undefined;
      payload.guests = amaGuests.split(',').map(g => g.trim()).filter(Boolean);
      payload.start_at = amaStart ? new Date(amaStart).toISOString() : undefined;
      payload.end_at = amaEnd ? new Date(amaEnd).toISOString() : undefined;
    }

    if (type === 'showcase') {
      payload.demo_url = demoUrl || undefined;
      payload.repo_url = repoUrl || undefined;
      payload.tech_stack = techStack.split(',').map(s => s.trim()).filter(Boolean);
      payload.feedback_mode = feedbackMode || undefined;
    }

    if (type === 'debate') {
      payload.position_for = positionFor;
      payload.position_against = positionAgainst;
      if (positionFor.trim().length < 3 || positionAgainst.trim().length < 3) {
        setError('Debate needs both positions filled (3+ characters each).');
        return;
      }
    }

    setBusy(true);
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        router.push(data.url);
        return;
      }
      if (res.status === 409 && Array.isArray(data.duplicates)) {
        setDuplicates(data.duplicates);
      }
      setError(data.error || 'Failed to create post. Please try again.');
    } catch {
      setError('Network error. Please try again.');
    }
    setBusy(false);
  };

  const improve = async () => {
    setError('');
    setImproveHint('');
    if (!title.trim() && !content.trim()) {
      setError('Write a title or some details first, then let AI polish it.');
      return;
    }
    setImproving(true);
    try {
      const res = await fetch('/api/community/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, content_type: type }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'AI improve failed.'); return; }
      if (d.title) setTitle(d.title);
      if (d.content) setContent(d.content);
      if (d.summary) setImproveHint(d.summary);
    } catch {
      setError('AI improve failed. Try again.');
    }
    setImproving(false);
  };

  const meta = CONTENT_TYPE_META[type];
  const Icon = meta.icon;
  const inputCls =
    'w-full rounded-lg border border-borderSoft bg-surface px-3 py-2 text-sm text-textPrimary placeholder:text-textSecondary/60 focus:outline-none focus:ring-2 focus:ring-brand/40';
  const labelCls = 'block text-xs font-medium text-textSecondary mb-1';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-textPrimary font-[family-name:var(--font-syne)]">Create a post</h1>
        <p className="text-sm text-textSecondary mt-1">Ask a question, start a discussion, run a poll, or share knowledge with the community.</p>
      </div>

      {/* Type picker */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CONTENT_TYPE_LIST.map(t => {
          const m = CONTENT_TYPE_META[t];
          const TIcon = m.icon;
          const active = t === type;
          return (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); setError(''); setDuplicates([]); }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors',
                active
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-borderSoft bg-surface text-textSecondary hover:border-brand/40 hover:text-textPrimary'
              )}
            >
              <TIcon className="h-3.5 w-3.5" aria-hidden />
              {m.short}
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-borderSoft bg-surface p-5">
          <div className="flex items-center justify-between mb-4 text-sm font-semibold text-textPrimary">
            <span className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-brand" aria-hidden />
              {meta.label}
              <span className="text-xs font-normal text-textSecondary">{meta.description}</span>
            </span>
            <button
              type="button"
              onClick={improve}
              disabled={improving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/5 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/10 disabled:opacity-50"
            >
              {improving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Wand2 className="h-3.5 w-3.5" aria-hidden />}
              {improving ? 'Polishing…' : 'Improve with AI'}
            </button>
          </div>

          {improveHint && (
            <div className="mb-4 rounded-lg border border-info/30 bg-info/5 px-3 py-2 text-xs text-info">
              AI: {improveHint}
            </div>
          )}

          <div className="mb-4">
            <label className={labelCls}>Title</label>
            <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder={`A clear ${meta.label.toLowerCase()} title...`} />
            <p className="text-[11px] text-textSecondary mt-1">{title.length}/200</p>
          </div>

          {type !== 'poll' && type !== 'quiz' && (
            <div className="mb-4">
              <label className={labelCls}>Details</label>
              <textarea className={cn(inputCls, 'min-h-28 resize-y')} value={content} onChange={e => setContent(e.target.value)} maxLength={50000} placeholder={type === 'debate' ? 'Framing, rules, and background for the debate...' : 'Add context, what you tried, what you expect...'} />
            </div>
          )}

          {type === 'question' && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelCls}>Difficulty</label>
                <select className={inputCls} value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                  {DIFFICULTIES.map(d => <option key={d} value={d} className="capitalize">{d}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Bounty (reputation points)</label>
                <input className={inputCls} type="number" min={0} max={500} value={bounty} onChange={e => setBounty(Math.max(0, Math.min(500, Number(e.target.value) || 0)))} />
              </div>
            </div>
          )}

          {type === 'poll' && (
            <div className="mb-4">
              <label className={labelCls}>Options ({pollOptions.filter(o => o.trim()).length}/10)</label>
              <div className="space-y-2">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input className={inputCls} value={opt} onChange={e => updatePollOption(i, e.target.value)} maxLength={80} placeholder={`Option ${i + 1}`} />
                    {pollOptions.length > 2 && (
                      <button type="button" onClick={() => removePollOption(i)} className="px-2 text-textSecondary hover:text-danger" aria-label="Remove option"><X className="h-4 w-4" /></button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < 10 && (
                <button type="button" onClick={addPollOption} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                  <Plus className="h-3.5 w-3.5" /> Add option
                </button>
              )}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className={labelCls}>Voting closes after</label>
                  <select className={inputCls} value={expiresInDays} onChange={e => setExpiresInDays(Number(e.target.value))}>
                    {EXPIRY_DAYS.map(d => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
                <div className="space-y-2 mt-5">
                  {[{ k: 'allow_change', v: allowChange, set: setAllowChange, l: 'Allow changing vote' },
                    { k: 'allow_multiple', v: allowMultiple, set: setAllowMultiple, l: 'Allow multiple choices' },
                    { k: 'anonymous', v: anonymous, set: setAnonymous, l: 'Anonymous voting' }].map(cfg => (
                    <label key={cfg.k} className="flex items-center gap-2 text-sm text-textPrimary">
                      <input type="checkbox" checked={cfg.v} onChange={e => cfg.set(e.target.checked)} className="rounded border-borderSoft" />
                      {cfg.l}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {type === 'quiz' && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-textSecondary">Questions ({quizQuestions.length}/20)</label>
                {quizQuestions.length < 20 && (
                  <button type="button" onClick={addQuizQ} className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                    <Plus className="h-3.5 w-3.5" /> Add question
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {quizQuestions.map((q, qi) => (
                  <div key={qi} className="rounded-lg border border-borderSoft p-4">
                    <div className="flex gap-2 mb-3">
                      <input className={inputCls} value={q.question} onChange={e => updateQuizQ(qi, { question: e.target.value })} maxLength={500} placeholder={`Question ${qi + 1} prompt`} />
                      {quizQuestions.length > 1 && (
                        <button type="button" onClick={() => removeQuizQ(qi)} className="px-2 text-textSecondary hover:text-danger" aria-label="Remove question"><X className="h-4 w-4" /></button>
                      )}
                    </div>
                    <div className="space-y-2 mb-3">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuizQ(qi, { correct_index: oi })}
                            className={cn('shrink-0 w-7 h-9 rounded-md border text-xs font-bold',
                              oi === q.correct_index ? 'border-success bg-success/10 text-success' : 'border-borderSoft text-textSecondary hover:border-success/50')}
                            title="Mark as correct answer"
                          >
                            {String.fromCharCode(65 + oi)}
                          </button>
                          <input className={inputCls} value={opt} onChange={e => updateQuizOpt(qi, oi, e.target.value)} maxLength={200} placeholder={`Answer ${String.fromCharCode(65 + oi)}`} />
                          {q.options.length > 2 && (
                            <button type="button" onClick={() => removeQuizOpt(qi, oi)} className="px-2 text-textSecondary hover:text-danger" aria-label="Remove answer"><X className="h-4 w-4" /></button>
                          )}
                        </div>
                      ))}
                    </div>
                    {q.options.length < 6 && (
                      <button type="button" onClick={() => addQuizOpt(qi)} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                        <Plus className="h-3.5 w-3.5" /> Add answer
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <input className={inputCls} value={q.explanation} onChange={e => updateQuizQ(qi, { explanation: e.target.value })} maxLength={500} placeholder="Explanation (shown after answering)" />
                      <input className={inputCls} type="number" min={1} max={10} value={q.points} onChange={e => updateQuizQ(qi, { points: Number(e.target.value) || 1 })} placeholder="Points (1-10)" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {type === 'ama' && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelCls}>Host (name/handle)</label>
                <input className={inputCls} value={amaHost} onChange={e => setAmaHost(e.target.value)} maxLength={100} placeholder="Who is hosting?" />
              </div>
              <div>
                <label className={labelCls}>Guests (comma separated)</label>
                <input className={inputCls} value={amaGuests} onChange={e => setAmaGuests(e.target.value)} maxLength={500} placeholder="guest1, guest2" />
              </div>
              <div>
                <label className={labelCls}>Starts</label>
                <input className={inputCls} type="datetime-local" value={amaStart} onChange={e => setAmaStart(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Ends</label>
                <input className={inputCls} type="datetime-local" value={amaEnd} onChange={e => setAmaEnd(e.target.value)} />
              </div>
            </div>
          )}

          {type === 'showcase' && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelCls}>Demo URL</label>
                <input className={inputCls} value={demoUrl} onChange={e => setDemoUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label className={labelCls}>Repo URL</label>
                <input className={inputCls} value={repoUrl} onChange={e => setRepoUrl(e.target.value)} placeholder="https://github.com/..." />
              </div>
              <div>
                <label className={labelCls}>Tech stack (comma separated)</label>
                <input className={inputCls} value={techStack} onChange={e => setTechStack(e.target.value)} placeholder="React, Node.js, Supabase" />
              </div>
              <div>
                <label className={labelCls}>Feedback mode</label>
                <select className={inputCls} value={feedbackMode} onChange={e => setFeedbackMode(e.target.value)}>
                  <option value="">Open feedback</option>
                  {FEEDBACK_MODES.map(m => <option key={m} value={m} className="capitalize">{m.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>
          )}

          {type === 'debate' && (
            <div className="grid grid-cols-1 gap-4 mb-4">
              <div>
                <label className={labelCls}>Position FOR</label>
                <textarea className={cn(inputCls, 'min-h-20 resize-y')} value={positionFor} onChange={e => setPositionFor(e.target.value)} maxLength={200} placeholder="The case you want argued FOR this topic..." />
              </div>
              <div>
                <label className={labelCls}>Position AGAINST</label>
                <textarea className={cn(inputCls, 'min-h-20 resize-y')} value={positionAgainst} onChange={e => setPositionAgainst(e.target.value)} maxLength={200} placeholder="The case you want argued AGAINST this topic..." />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tags (max 8)</label>
              <input className={inputCls} value={tags} onChange={e => setTags(e.target.value)} maxLength={300} placeholder="react, nextjs, performance" />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} value={categoryId} onChange={e => setCategoryId(e.target.value)} onClick={loadCategories}>
                <option value="">Auto (first available)</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {duplicates.length > 0 && (
          <div className="rounded-xl border border-warning/40 bg-warning/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-warning mb-2">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              Very similar posts already exist
            </div>
            <ul className="space-y-2">
              {duplicates.map(d => (
                <li key={d.id} className="text-sm">
                  <Link
                    href={d.content_type === 'question' ? `/answers/${d.slug ?? d.id}` : `/community/forum/general/${d.id}`}
                    className="text-textPrimary hover:text-brand underline"
                  >
                    {d.title}
                  </Link>
                  <span className="text-xs text-textSecondary ml-2">{(d.similarity * 100).toFixed(0)}% similar</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-textSecondary mt-2">You can still post if your question adds something new.</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-danger/40 bg-danger/5 p-4 text-sm text-danger flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <Link href="/community" className="text-sm text-textSecondary hover:text-textPrimary">Cancel</Link>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
              {busy ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
