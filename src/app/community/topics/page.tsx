'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Search, Hash, FileText, Users, Sparkles } from 'lucide-react';
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
              <div key={i} className="h-24 rounded-xl bg-surface-2 animate-pulse" />
            ))}
          </div>
        ) : topics.length === 0 ? (
          <div className="rounded-xl border border-borderSoft bg-surface p-10 text-center text-sm text-textSecondary">
            No topics found{q ? ` for "${q}"` : ''}.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topics.map(t => (
              <Link
                key={t.id}
                href={`/community/topics/${t.slug}`}
                className="group rounded-xl border border-borderSoft bg-surface p-4 hover:bg-surface-elevated hover:border-accent/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-lg"
                    style={{ background: `${t.color || '#F59E0B'}22`, color: t.color || '#F59E0B' }}
                  >
                    {t.icon || '#'}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-textPrimary truncate group-hover:text-accent transition-colors">{t.name}</p>
                    <p className="text-xs text-textSecondary flex items-center gap-2">
                      <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" aria-hidden /> {t.post_count} posts</span>
                      <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" aria-hidden /> {t.follower_count}</span>
                    </p>
                  </div>
                </div>
                {t.description && (
                  <p className={cn('mt-2 text-xs text-textSecondary line-clamp-2', !t.description && 'hidden')}>{t.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}