'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CONTENT_TYPE_META, CONTENT_TYPE_LIST, type CommunityContentType } from '@/lib/community-types';
import {
  Command, FileQuestion, MessagesSquare, Vote, ListChecks, Mic2, Sparkles, Scale,
  Search, CornerDownLeft, Compass, Trophy, CalendarDays, GraduationCap, PenSquare, X, Hash,
} from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  slug: string | null;
  content_type: CommunityContentType;
  reply_count: number;
}

const QUICK_LINKS = [
  { href: '/community', label: 'Discover', icon: Compass },
  { href: '/community/questions', label: 'Questions', icon: FileQuestion },
  { href: '/community/forum', label: 'Discussions', icon: MessagesSquare },
  { href: '/community/polls', label: 'Polls', icon: Vote },
  { href: '/community/quiz', label: 'Quizzes', icon: ListChecks },
  { href: '/community/events', label: 'Events', icon: CalendarDays },
  { href: '/community/learning-paths', label: 'Learn', icon: GraduationCap },
  { href: '/community/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/community/topics', label: 'Topics', icon: Hash },
];

function hrefFor(r: SearchResult): string {
  return r.content_type === 'question' ? `/answers/${r.slug ?? r.id}` : `/community/forum/general/${r.id}`;
}

export function CommandCenter() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQ('');
    setResults([]);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      if ((e.key === 'c' || e.key === 'C') && !typing) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.trim().length < 2) { setResults([]); return; }
    setBusy(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/community/posts?q=${encodeURIComponent(q.trim().slice(0, 80))}`);
        const d = await res.json();
        setResults((d.results || []).slice(0, 6));
      } catch {
        setResults([]);
      }
      setBusy(false);
    }, 200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[12vh] px-4" role="dialog" aria-modal="true" aria-label="Command center">
      <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} aria-label="Close command center" />
      <div className="relative w-full max-w-xl rounded-2xl border border-borderSoft bg-surface shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 border-b border-borderSoft px-4 py-3">
          <Command className="h-4 w-4 text-textSecondary shrink-0" aria-hidden />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search posts, or press C to navigate..."
            className="flex-1 bg-transparent text-sm text-textPrimary placeholder:text-textSecondary/60 focus:outline-none"
            onKeyDown={e => {
              if (e.key === 'Enter' && results.length > 0) {
                router.push(hrefFor(results[0]));
                close();
              }
            }}
          />
          {busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand border-t-transparent" aria-label="Searching" />}
          <button type="button" onClick={close} className="text-textSecondary hover:text-textPrimary" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto">
          {q.trim().length < 2 ? (
            <>
              <div className="px-4 py-3 border-b border-borderSoft">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-textSecondary mb-2">Create</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {CONTENT_TYPE_LIST.map(t => {
                    const m = CONTENT_TYPE_META[t];
                    const TIcon = m.icon;
                    return (
                      <Link
                        key={t}
                        href={`/community/create?type=${t}`}
                        onClick={close}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-textPrimary hover:bg-surface-2"
                      >
                        <TIcon className="h-3.5 w-3.5 text-brand" aria-hidden />
                        {m.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-textSecondary mb-2">Jump to</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {QUICK_LINKS.map(l => {
                    const LIcon = l.icon;
                    return (
                      <Link
                        key={l.href}
                        href={l.href}
                        onClick={close}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-textPrimary hover:bg-surface-2"
                      >
                        <LIcon className="h-3.5 w-3.5 text-brand" aria-hidden />
                        {l.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-textSecondary text-center">
              {busy ? 'Searching…' : 'No posts found.'}
            </p>
          ) : (
            <ul className="py-1.5">
              {results.map(r => {
                const m = CONTENT_TYPE_META[r.content_type] || CONTENT_TYPE_META.discussion;
                const MIcon = m.icon;
                return (
                  <li key={r.id}>
                    <Link
                      href={hrefFor(r)}
                      onClick={close}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2"
                    >
                      <MIcon className="h-4 w-4 shrink-0 text-brand" aria-hidden />
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-sm text-textPrimary">{r.title}</span>
                        <span className="block text-[11px] text-textSecondary">{m.label} · {r.reply_count} replies</span>
                      </span>
                      <CornerDownLeft className="h-3.5 w-3.5 text-textSecondary" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-borderSoft bg-surface-2/50 px-4 py-2 text-[11px] text-textSecondary">
          <span className="flex items-center gap-1"><kbd className="rounded border border-borderSoft bg-surface px-1">C</kbd> open</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-borderSoft bg-surface px-1">↵</kbd> go</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-borderSoft bg-surface px-1">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}