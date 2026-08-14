'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Trophy, Sparkles, Crown, Medal, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { JsonLd } from '@/components/ui/jsonld';
import { breadcrumbSchema } from '@/lib/jsonld';
import { CommunityHero } from '@/components/community/community-hero';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  level: number;
  score: number;
  rank: string;
}

const RANK_STYLES = [
  { label: '1st', ring: 'border-amber-400/60', chip: 'bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-300/40', hover: 'hover:shadow-amber-500/10' },
  { label: '2nd', ring: 'border-slate-400/50', chip: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-400/40', hover: 'hover:shadow-slate-500/10' },
  { label: '3rd', ring: 'border-orange-500/50', chip: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-400/40', hover: 'hover:shadow-orange-500/10' },
];

function Avatar({ entry, className }: { entry: LeaderboardEntry; className?: string }) {
  return entry.avatar_url ? (
    <img src={entry.avatar_url} alt={entry.username} className={`rounded-full object-cover ${className}`} loading="lazy" />
  ) : (
    <div className={`rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-semibold ${className}`}>
      {entry.username?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

export default function LeaderboardPage() {
  const supabase = createClient();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [period, setPeriod] = useState<'all' | 'daily' | 'weekly'>('all');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadLeaderboard = useCallback(async (p: 'all' | 'daily' | 'weekly' = 'all') => {
    try {
      const res = await fetch(`/api/community/leaderboard?period=${p}`);
      const d = await res.json();
      setEntries(d.entries || []);
      setLastSync(new Date());
    } catch {
      // keep existing data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard(period);
    const channel = supabase
      .channel(`leaderboard_live_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_xp_log" }, () => loadLeaderboard(period))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "user_profiles" }, () => loadLeaderboard(period))
      .subscribe();
    channelRef.current = channel;
    const poll = setInterval(() => loadLeaderboard(period), 30000);
    const onFocus = () => loadLeaderboard(period);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channelRef.current!);
    };
  }, [supabase, loadLeaderboard, period]);

  const topScore = entries[0]?.score || 0;

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: "https://techpivo.com" },
        { name: "Community", url: "https://techpivo.com/community" },
        { name: "Leaderboard" },
      ])} />
      <div className="min-h-screen bg-background">
      {/* Hero */}
      <CommunityHero
        badge="Leaderboard"
        title="Top Contributors"
        subtitle="Ranked by experience points earned across the community."
        icon={<Sparkles className="h-3.5 w-3.5" />}
        backHref="/community"
        backLabel="Back to Community"
        imageUrl={null}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
          </span>
          <div className="flex gap-1 rounded-lg bg-white/10 border border-white/15 p-0.5">
            {([['all', 'All time'], ['weekly', 'This week'], ['daily', 'Today']] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  period === key
                    ? 'bg-white text-slate-950'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {lastSync && (
            <span className="inline-flex items-center gap-1.5 text-xs text-white/60">
              <RefreshCw className="h-3 w-3" /> Updated {lastSync.toLocaleTimeString()}
            </span>
          )}
        </div>
      </CommunityHero>

      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="rounded-2xl bg-muted/40 animate-pulse h-16" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted/50 mb-6">
              <Trophy className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Contributors Yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">Start participating in the community to earn XP and appear here.</p>
          </div>
        ) : (
          <>
            {/* Podium */}
            {entries.length >= 3 && (
              <div className="grid grid-cols-3 gap-3 md:gap-5 mb-10 max-w-2xl mx-auto">
                {[
                  { entry: entries[1], medal: <Medal className="h-5 w-5 text-slate-500" />, label: '2nd' },
                  { entry: entries[0], medal: <Crown className="h-6 w-6 text-amber-500" />, label: '1st' },
                  { entry: entries[2], medal: <Medal className="h-5 w-5 text-orange-400" />, label: '3rd' },
                ].map(({ entry, medal, label }) => {
                  const style = RANK_STYLES[['1st', '2nd', '3rd'].indexOf(label)];
                  return (
                    <Link key={entry.user_id} href={`/u/${entry.username}`} className={`group ${label === '1st' ? 'md:-mt-4' : ''}`}>
                      <div className={`rounded-2xl border ${style.ring} bg-card/80 backdrop-blur-sm p-4 md:p-6 text-center shadow-lg shadow-slate-900/5 hover:shadow-xl ${style.hover} transition-all duration-300 h-full`}>
                        <div className="flex items-center justify-center mb-3">
                          {medal}
                          <span className={`ml-1.5 text-xs font-semibold ${style.chip.split(' ').slice(-2).join(' ')}`}>{label}</span>
                        </div>
                        <Avatar entry={entry} className="w-14 h-14 mx-auto mb-3 text-lg shadow-md" />
                        <div className="font-semibold text-sm truncate">{entry.username}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Level {entry.level} · {entry.rank}</div>
                        <div className="text-base font-bold mt-1.5 tabular-nums">{entry.score.toLocaleString()} <span className="text-xs font-medium text-muted-foreground">XP</span></div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* List */}
            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
              {entries.map((entry, i) => {
                const rankStyle = i < 3 ? RANK_STYLES[i] : null;
                const pct = topScore > 0 ? Math.max((entry.score / topScore) * 100, 3) : 0;
                return (
                  <Link
                    key={entry.user_id}
                    href={`/u/${entry.username}`}
                    className={`flex items-center gap-3 md:gap-4 px-4 md:px-6 py-4 hover:bg-muted/50 transition-colors ${i > 0 ? 'border-t border-border/40' : ''}`}
                  >
                    <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 border ${
                      rankStyle ? rankStyle.chip : 'bg-muted text-muted-foreground border-transparent'
                    }`}>
                      {rankStyle ? (i === 0 ? <Crown className="h-4 w-4" /> : i === 1 ? <Medal className="h-4 w-4" /> : <Medal className="h-4 w-4" />) : `#${i + 1}`}
                    </div>
                    <Avatar entry={entry} className="w-10 h-10 md:w-11 md:h-11 shrink-0 text-sm shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{entry.username}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>Level {entry.level}</span>
                        <span className="text-xs text-muted-foreground/40">·</span>
                        <span className="truncate">{entry.rank}</span>
                      </div>
                    </div>
                    <div className="w-24 md:w-36 shrink-0 hidden sm:block">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-slate-600 to-slate-800 dark:from-slate-400 dark:to-slate-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold tabular-nums">{entry.score.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">XP</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}
