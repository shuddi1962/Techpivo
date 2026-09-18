'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import {
  History, BookOpen, Clock, ArrowRight, CheckCircle2,
  BarChart3, TrendingUp, Flame
} from 'lucide-react';

interface HistoryEntry {
  id: string;
  post_id: string;
  title: string | null;
  slug: string | null;
  progress: number;
  completed: boolean;
  last_read: string;
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const channelName = useRef(`account_history_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`).current;

  const load = (quiet = false) => {
    if (!mountedRef.current) return;
    if (!quiet) setLoading(true);
    fetch('/api/community/history')
      .then(r => r.json())
      .then(d => { if (mountedRef.current) { setHistory(d.history || []); setLoading(false); } })
      .catch(() => { if (mountedRef.current) setLoading(false); });
  };

  useEffect(() => {
    mountedRef.current = true;
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_reading_history' }, () => load(true))
      .subscribe();
    const interval = setInterval(() => load(true), 30000);
    return () => { mountedRef.current = false; supabase.removeChannel(channel); clearInterval(interval); };
  }, []);

  const completedCount = history.filter(h => h.completed).length;
  const avgProgress = history.length > 0
    ? Math.round(history.reduce((s, h) => s + (h.progress || 0), 0) / history.length)
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h2 className="text-2xl font-bold">Reading History</h2><p className="text-muted-foreground mt-1">Articles you&apos;ve read recently</p></div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-surface-2 animate-pulse" />)}
        </div>
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className={`flex items-center gap-4 px-5 py-4 ${i < 3 ? 'border-b border-border/40' : ''}`}>
              <div className="w-10 h-10 rounded-xl bg-surface-2 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-surface-2 rounded-lg w-2/3 animate-pulse" />
                <div className="h-3 bg-surface-2 rounded-lg w-1/4 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reading History</h2>
          <p className="text-muted-foreground mt-1">Articles you&apos;ve read recently</p>
        </div>
        {history.length > 0 && (
          <span className="px-3 py-1 rounded-full bg-surface-2/50 text-sm font-medium text-muted-foreground tabular-nums">
            {history.length} articles
          </span>
        )}
      </div>

      {/* Stats */}
      {history.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-blue-500" />
              </div>
              <span className="text-sm font-medium">Articles Read</span>
            </div>
            <div className="text-2xl font-bold tabular-nums">{history.length}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <span className="text-sm font-medium">Completed</span>
            </div>
            <div className="text-2xl font-bold tabular-nums">{completedCount}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </div>
              <span className="text-sm font-medium">Avg. Progress</span>
            </div>
            <div className="text-2xl font-bold tabular-nums">{avgProgress}%</div>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
            <History className="h-7 w-7 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Reading History</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
            Start reading articles to track your progress and build your reading history here.
          </p>
          <Link href="/">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white px-6">
              Start Reading <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="divide-y divide-border/40">
            {history.map((entry) => {
              const progressPct = Math.min(100, entry.progress || 0);
              return (
                <div key={entry.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-2/30 transition-colors group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    entry.completed
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    {entry.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <BookOpen className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/${entry.slug || entry.post_id}`}
                      className="text-sm font-semibold hover:text-primary transition-colors truncate block"
                    >
                      {entry.title || 'Untitled Article'}
                    </Link>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {timeAgo(entry.last_read)}
                      </div>
                      {!entry.completed && (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 bg-surface-2 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums">{progressPct}%</span>
                        </div>
                      )}
                      {entry.completed && (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Completed</span>
                      )}
                    </div>
                  </div>
                  <Link href={`/${entry.slug || entry.post_id}`}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
