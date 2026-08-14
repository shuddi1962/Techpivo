'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PostCard } from '@/components/community/post-card';
import { EmptyState } from '@/components/community/empty-state';
import { type CommunityPost } from '@/lib/community-types';
import { Search, Hash, User as UserIcon, Loader2 } from 'lucide-react';

interface SearchResult {
  query: string;
  posts: CommunityPost[];
  topics: { id: string; slug: string; name: string; description: string | null; icon: string | null; color: string | null }[];
  users: { id: string; username: string | null; full_name: string | null; avatar_url: string | null; level: number }[];
}

export function CommunitySearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const [q, setQ] = useState(initialQ);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/community/search?q=${encodeURIComponent(term)}`, { cache: 'no-store' });
      const d = await res.json();
      setResults(d);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.replace(`/community/search?q=${encodeURIComponent(q)}`, { scroll: false });
      void runSearch(q);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, router, runSearch]);

  const total = results ? results.posts.length + results.topics.length + results.users.length : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-textPrimary flex items-center gap-2">
          <Search className="h-6 w-6 text-accent" aria-hidden /> Community search
        </h1>
        <p className="text-sm text-textSecondary mt-1">Search posts, topics, and members.</p>
      </div>

      <div className="relative mb-6 max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-textSecondary" aria-hidden />
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Try “python”, “CSS”, “Next.js”…"
          className="w-full rounded-lg border border-borderSoft bg-surface py-2.5 pl-9 pr-3 text-sm text-textPrimary outline-none focus:border-accent"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-textSecondary mb-4">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Searching…
        </div>
      )}

      {!loading && results && total === 0 && (
        <EmptyState title="No results" description={`Nothing found for “${results.query}”. Try different keywords.`} />
      )}

      {results && results.posts.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-textSecondary mb-3">Posts ({results.posts.length})</h2>
          <div className="space-y-3">
            {results.posts.map(p => <PostCard key={p.id} post={p} showBody={false} />)}
          </div>
        </section>
      )}

      {results && results.topics.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-textSecondary mb-3">Topics ({results.topics.length})</h2>
          <div className="flex flex-wrap gap-2">
            {results.topics.map(t => (
              <Link
                key={t.id}
                href={`/community/topics/${t.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-borderSoft bg-surface px-3 py-1.5 text-sm text-textPrimary hover:bg-surface-elevated hover:border-accent/40 transition-colors"
              >
                <Hash className="h-3.5 w-3.5 text-accent" aria-hidden /> {t.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {results && results.users.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-textSecondary mb-3">Members ({results.users.length})</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {results.users.map(u => {
              const href = u.username ? `/u/${u.username}` : null;
              const content = (
                <>
                  {u.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-textSecondary">
                      <UserIcon className="h-4 w-4" aria-hidden />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-textPrimary truncate">{u.full_name || u.username || 'Member'}</p>
                    <p className="text-xs text-textSecondary">@{u.username || 'member'} · Level {u.level}</p>
                  </div>
                </>
              );
              if (!href) return <div key={u.id} className="flex items-center gap-3 rounded-xl border border-borderSoft bg-surface p-3">{content}</div>;
              return (
                <Link
                  key={u.id}
                  href={href}
                  className="flex items-center gap-3 rounded-xl border border-borderSoft bg-surface p-3 hover:bg-surface-elevated transition-colors"
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}