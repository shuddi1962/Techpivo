'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Search, Hash, FileText, Users, Sparkles, ChevronRight } from 'lucide-react';
import { CommunityHero } from '@/components/community/community-hero';
import { TopicIcon } from '@/components/community/topic-icon';

interface TopicRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  post_count: number;
  follower_count: number;
}

const FALLBACK_COLOR = '#2563eb';

function topicLetter(name: string): string {
  const ch = (name || '').trim().charAt(0).toUpperCase();
  return /[A-Z0-9]/.test(ch) ? ch : '#';
}

export default function TopicsDirectoryPage() {
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (query: string) => {
    try {
      const res = await fetch(`/api/community/topics${query ? `?q=${encodeURIComponent(query)}` : ''}`, { cache: 'no-store' });
      const d = await res.json();
      setTopics(d.topics || []);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(q);
    pollRef.current = setInterval(() => void load(q), 30000);
    const onFocus = () => void load(q);
    window.addEventListener('focus', onFocus);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      window.removeEventListener('focus', onFocus);
    };
  }, [load, q]);

  const totalPosts = topics.reduce((a, t) => a + t.post_count, 0);
  const totalFollowers = topics.reduce((a, t) => a + t.follower_count, 0);

  const tileStyle = (t: TopicRow) => {
    const c = t.color || FALLBACK_COLOR;
    return {
      background: `linear-gradient(135deg, ${c}26 0%, ${c}0a 100%)`,
      color: c,
    };
  };

  const sorted = [...topics].sort((a, b) => a.name.localeCompare(b.name));
  const groups: { letter: string; items: TopicRow[] }[] = [];
  for (const t of sorted) {
    const letter = topicLetter(t.name);
    const last = groups[groups.length - 1];
    if (last && last.letter === letter) last.items.push(t);
    else groups.push({ letter, items: [t] });
  }

  return (
    <div>
      <CommunityHero
        badge="Topics"
        title="Explore Topics"
        subtitle="Follow topics to see focused discussions from the TechPivo community."
        icon={<Sparkles className="h-3.5 w-3.5" />}
        backHref="/community"
        backLabel="Back to Community"
        imageUrl={null}
      />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mb-6 max-w-md">
          {[
            { label: 'Topics', value: topics.length, icon: <Hash className="h-3.5 w-3.5" aria-hidden /> },
            { label: 'Posts', value: totalPosts, icon: <FileText className="h-3.5 w-3.5" aria-hidden /> },
            { label: 'Followers', value: totalFollowers, icon: <Users className="h-3.5 w-3.5" aria-hidden /> },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-borderSoft bg-surface px-3 py-2.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-textSecondary uppercase tracking-wide">
                {s.icon} {s.label}
              </div>
              <p className="mt-0.5 text-lg font-bold text-textPrimary tabular-nums">{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-textSecondary" aria-hidden />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setLoading(true); }}
            placeholder="Search topics…"
            className="w-full rounded-lg border border-borderSoft bg-surface py-2 pl-9 pr-3 text-sm text-textPrimary outline-none focus:border-accent"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-surface-2 animate-pulse" />
            ))}
          </div>
        ) : topics.length === 0 ? (
          <div className="rounded-xl border border-borderSoft bg-surface p-10 text-center text-sm text-textSecondary">
            No topics found{q ? ` for "${q}"` : ''}.
          </div>
        ) : (
          <div className="space-y-7">
            {groups.map(g => (
              <section key={g.letter} aria-label={`Topics starting with ${g.letter}`}>
                <h2 className="mb-2.5 flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-[13px] font-black text-brand">
                    {g.letter}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-textSecondary">{g.letter} · {g.items.length} topic{g.items.length === 1 ? '' : 's'}</span>
                </h2>
                <div className="divide-y divide-borderSoft overflow-hidden rounded-2xl border border-borderSoft bg-surface">
                  {g.items.map(t => (
                    <Link
                      key={t.id}
                      href={`/community/topics/${t.slug}`}
                      className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-surface-elevated"
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={tileStyle(t)}
                      >
                        <TopicIcon name={t.icon} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn('font-semibold text-textPrimary transition-colors group-hover:text-brand', t.description ? '' : 'truncate')}>
                          {t.name}
                        </p>
                        {t.description && (
                          <p className="mt-0.5 truncate text-xs text-textSecondary">{t.description}</p>
                        )}
                      </div>
                      <div className="hidden shrink-0 items-center gap-3 sm:flex">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1 text-[11px] font-medium text-textSecondary tabular-nums">
                          <FileText className="h-3 w-3" aria-hidden /> {t.post_count}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1 text-[11px] font-medium text-textSecondary tabular-nums">
                          <Users className="h-3 w-3" aria-hidden /> {t.follower_count}
                        </span>
                      </div>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-textSecondary/40 transition-all group-hover:translate-x-0.5 group-hover:text-brand"
                        aria-hidden
                      />
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
