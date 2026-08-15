'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Search, Hash, FileText, Users, Sparkles, ArrowRight, TrendingUp } from 'lucide-react';
import { CommunityHero } from '@/components/community/community-hero';

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
  const trending = [...topics].sort((a, b) => b.post_count - a.post_count).slice(0, 3);

  const tileStyle = (t: TopicRow) => {
    const c = t.color || FALLBACK_COLOR;
    return {
      background: `linear-gradient(135deg, ${c}26 0%, ${c}0a 100%)`,
      color: c,
    };
  };

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

      <div className="max-w-7xl mx-auto px-4 py-8">
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

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-textSecondary" aria-hidden />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setLoading(true); }}
            placeholder="Search topics…"
            className="w-full rounded-lg border border-borderSoft bg-surface py-2 pl-9 pr-3 text-sm text-textPrimary outline-none focus:border-accent"
          />
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-surface-2 animate-pulse" />
            ))}
          </div>
        ) : topics.length === 0 ? (
          <div className="rounded-xl border border-borderSoft bg-surface p-10 text-center text-sm text-textSecondary">
            No topics found{q ? ` for "${q}"` : ''}.
          </div>
        ) : (
          <>
            {!q && trending.length > 0 && (
              <section className="mb-8" aria-label="Trending topics">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-textSecondary mb-3">
                  <TrendingUp className="h-4 w-4 text-brand" aria-hidden /> Trending now
                </h2>
                <div className="grid sm:grid-cols-3 gap-3">
                  {trending.map((t, i) => (
                    <Link
                      key={t.id}
                      href={`/community/topics/${t.slug}`}
                      className="group relative overflow-hidden rounded-2xl border border-borderSoft bg-gradient-to-br from-surface via-surface to-surface-2 p-5 hover:border-brand/40 transition-colors"
                    >
                      <div
                        className="absolute inset-x-0 top-0 h-1"
                        style={{ background: `linear-gradient(90deg, ${t.color || FALLBACK_COLOR}, transparent)` }}
                      />
                      <div className="flex items-start justify-between">
                        <span
                          className="flex h-11 w-11 items-center justify-center rounded-xl text-xl"
                          style={tileStyle(t)}
                        >
                          {t.icon || '#'}
                        </span>
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-textSecondary tabular-nums">
                          #{i + 1}
                        </span>
                      </div>
                      <p className="mt-3 font-bold text-textPrimary group-hover:text-brand transition-colors">{t.name}</p>
                      <p className="mt-0.5 text-xs text-textSecondary">{t.post_count} posts · {t.follower_count} following</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-textSecondary mb-3">
              <Hash className="h-4 w-4 text-brand" aria-hidden /> All topics
              <span className="ml-auto font-medium normal-case text-textSecondary/70">{topics.length} topics</span>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {topics.map(t => (
                <Link
                  key={t.id}
                  href={`/community/topics/${t.slug}`}
                  className="group rounded-2xl border border-borderSoft bg-surface p-4 hover:bg-surface-elevated hover:border-brand/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl text-lg" style={tileStyle(t)}>
                      {t.icon || '#'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-textPrimary truncate group-hover:text-brand transition-colors">{t.name}</p>
                      <p className="text-xs text-textSecondary flex items-center gap-2">
                        <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" aria-hidden /> {t.post_count} posts</span>
                        <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" aria-hidden /> {t.follower_count}</span>
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-textSecondary/40 group-hover:text-brand group-hover:translate-x-0.5 transition-all shrink-0" aria-hidden />
                  </div>
                  {t.description && (
                    <p className="mt-2 text-xs text-textSecondary line-clamp-2">{t.description}</p>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
