'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Trophy, Star, ArrowLeft, Sparkles, Crown, Medal, Timer, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { JsonLd } from '@/components/ui/jsonld';
import { breadcrumbSchema } from '@/lib/jsonld';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  level: number;
  score: number;
  rank: string;
}

export default function LeaderboardPage() {
  const supabase = createClient();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/community/leaderboard');
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
    loadLeaderboard();
    const channel = supabase
      .channel(`leaderboard_live_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_xp_log" }, () => loadLeaderboard())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "user_profiles" }, () => loadLeaderboard())
      .subscribe();
    channelRef.current = channel;
    const poll = setInterval(loadLeaderboard, 30000);
    const onFocus = () => loadLeaderboard();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channelRef.current!);
    };
  }, [supabase, loadLeaderboard]);

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: "https://techpivo.com" },
        { name: "Community", url: "https://techpivo.com/community" },
        { name: "Leaderboard" },
      ])} />
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-600/10 via-yellow-500/5 to-orange-600/10 dark:from-amber-500/5 dark:via-yellow-500/5 dark:to-orange-500/5 border-b border-border/40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,_var(--tw-gradient-stops))] from-amber-400/10 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-20 relative">
          <Link href="/community" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Community
          </Link>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-medium mb-4">
              <Sparkles className="h-3.5 w-3.5" /> Leaderboard
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-syne)] tracking-tight">
              Top Contributors
            </h1>
            <p className="text-lg text-muted-foreground mt-3 max-w-xl">
              Ranked by experience points. Participate to climb the ranks!
            </p>
            <div className="flex items-center gap-3 mt-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
              </span>
              {lastSync && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RefreshCw className="h-3 w-3" /> Updated {lastSync.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

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
              <div className="grid grid-cols-3 gap-4 mb-10 max-w-lg mx-auto">
                {[
                  { entry: entries[1], medal: <Medal className="h-7 w-7 text-gray-400" />, color: 'from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700', scale: '' },
                  { entry: entries[0], medal: <Crown className="h-7 w-7 text-yellow-500" />, color: 'from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/40', scale: 'scale-105' },
                  { entry: entries[2], medal: <Medal className="h-7 w-7 text-orange-400" />, color: 'from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30', scale: '' },
                ].map(({ entry, medal, color, scale }) => (
                  <Link key={entry.user_id} href={`/u/${entry.username}`} className={`group ${scale}`}>
                    <div className={`rounded-2xl bg-gradient-to-b ${color} p-5 text-center hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300`}>
                      <div className="flex items-center justify-center mb-2">{medal}</div>
                      <div className="w-14 h-14 mx-auto mb-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-lg font-bold text-white shadow-sm">
                        {entry.full_name?.[0] || entry.username?.[0] || '?'}
                      </div>
                      <div className="font-semibold text-sm truncate">{entry.full_name || entry.username}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Level {entry.level}</div>
                      <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1">{entry.score.toLocaleString()} XP</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* List */}
            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
              {entries.map((entry, i) => {
                const rowColors = ['bg-yellow-500/5', 'bg-gray-500/5', 'bg-orange-500/5'];
                return (
                  <Link
                    key={entry.user_id}
                    href={`/u/${entry.username}`}
                    className={`flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors ${i < 3 ? rowColors[i] : ''} ${i > 0 ? 'border-t border-border/40' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                      i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      i === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' :
                      i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {i === 0 ? <Crown className="h-4 w-4" /> : i === 1 ? <Medal className="h-4 w-4" /> : i === 2 ? <Medal className="h-4 w-4" /> : `#${i + 1}`}
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm">
                      {entry.full_name?.[0] || entry.username?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{entry.full_name || entry.username}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>Level {entry.level}</span>
                        <span className="text-xs text-muted-foreground/40">·</span>
                        <span>{entry.rank}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-amber-600 dark:text-amber-400">{entry.score.toLocaleString()}</div>
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