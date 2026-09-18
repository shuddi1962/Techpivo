'use client';

import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { getLevelForXP, getRankTitle, BADGES } from '@/lib/community-utils';
import {
  Activity, Star, TrendingUp, Clock, Award, Flame, Zap, Target,
  BookOpen, MessageSquare, Trophy, Heart, UserPlus, Share2, ArrowUpRight,
  CheckCircle2
} from 'lucide-react';

interface Profile { xp: number; level: number; streak: number; badges: string[]; created_at: string; username: string | null; }
interface XpEntry { id: string; amount: number; reason: string; reference_type: string | null; created_at: string; }

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

function xpIcon(reason: string) {
  const r = reason.toLowerCase();
  if (r.includes('read')) return { icon: BookOpen, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' };
  if (r.includes('comment') || r.includes('answer') || r.includes('discuss')) return { icon: MessageSquare, color: 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30' };
  if (r.includes('quiz')) return { icon: Trophy, color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30' };
  if (r.includes('follow')) return { icon: UserPlus, color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30' };
  if (r.includes('bookmark') || r.includes('like') || r.includes('vote')) return { icon: Heart, color: 'text-pink-500 bg-pink-100 dark:bg-pink-900/30' };
  if (r.includes('share')) return { icon: Share2, color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30' };
  if (r.includes('profile') || r.includes('complete')) return { icon: CheckCircle2, color: 'text-teal-500 bg-teal-100 dark:bg-teal-900/30' };
  if (r.includes('streak') || r.includes('daily') || r.includes('login')) return { icon: Flame, color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30' };
  if (r.includes('news') || r.includes('subscrib')) return { icon: Zap, color: 'text-cyan-500 bg-cyan-100 dark:bg-cyan-900/30' };
  return { icon: Star, color: 'text-primary bg-primary/10' };
}

export default function ActivityPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [xpLog, setXpLog] = useState<XpEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'xp' | 'badges'>('overview');
  const mountedRef = useRef(true);
  const channelName = useRef(`account_activity_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`).current;

  const load = (quiet = false) => {
    if (!mountedRef.current) return;
    if (!quiet) setLoading(true);
    Promise.all([
      fetch('/api/community/profile').then(r => r.json()).catch(() => ({ profile: null })),
      fetch('/api/community/xp-log').then(r => r.json()).catch(() => ({ entries: [] })),
    ]).then(([p, x]) => {
      if (mountedRef.current) {
        setProfile(p.profile || null);
        setXpLog(x.entries || []);
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    mountedRef.current = true;
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_xp_log' }, () => load(true))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles' }, () => load(true))
      .subscribe();
    const interval = setInterval(() => load(true), 30000);
    return () => { mountedRef.current = false; supabase.removeChannel(channel); clearInterval(interval); };
  }, []);

  const level = profile ? getLevelForXP(profile.xp) : null;
  const rankTitle = profile ? getRankTitle(profile.xp) : 'Member';
  const nextLevelXp = level ? level.xpForNext : 0;
  const prevLevelXp = level ? Math.max(0, level.xpForNext - (level.level > 1 ? getLevelForXP((profile?.xp || 0) - 1)?.xpForNext || 0 : 0)) : 0;
  const progressPct = profile && nextLevelXp > prevLevelXp ? Math.min(100, ((profile.xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100) : 0;
  const earnedBadges = profile?.badges || [];
  const todayXp = xpLog.filter(e => {
    const d = new Date(e.created_at); const now = new Date();
    return d.toDateString() === now.toDateString();
  }).reduce((s, e) => s + e.amount, 0);
  const weekXp = xpLog.filter(e => {
    const d = new Date(e.created_at); const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  }).reduce((s, e) => s + e.amount, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h2 className="text-2xl font-bold">Activity & Achievements</h2><p className="text-muted-foreground mt-1">Track your XP earnings, streaks, and milestones</p></div>
        <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-surface-2 animate-pulse" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Activity & Achievements</h2>
        <p className="text-muted-foreground mt-1">Track your XP earnings, streaks, and milestones</p>
      </div>

      {/* Level Card */}
      {profile && (
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">Lv.{profile.level}</span>
              </div>
              <div>
                <h3 className="text-lg font-bold">{rankTitle}</h3>
                <p className="text-sm text-muted-foreground">{profile.xp.toLocaleString()} total XP earned</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-center">
              <div className="px-4 py-2 rounded-xl bg-surface-2/50">
                <div className="text-xl font-bold text-primary">{todayXp}</div>
                <div className="text-xs text-muted-foreground">Today</div>
              </div>
              <div className="px-4 py-2 rounded-xl bg-surface-2/50">
                <div className="text-xl font-bold text-amber-500">{weekXp}</div>
                <div className="text-xs text-muted-foreground">This Week</div>
              </div>
              <div className="px-4 py-2 rounded-xl bg-surface-2/50">
                <div className="text-xl font-bold text-emerald-500 flex items-center gap-1">
                  <Flame className="h-5 w-5" />{profile.streak}
                </div>
                <div className="text-xs text-muted-foreground">Day Streak</div>
              </div>
            </div>
          </div>
          {/* XP progress */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Level {profile.level}</span>
              <span>{profile.xp}/{nextLevelXp} XP to Level {(profile.level || 1) + 1}</span>
            </div>
            <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-2/50 p-1 rounded-xl">
        {[
          { key: 'overview' as const, label: 'Overview', icon: Activity },
          { key: 'xp' as const, label: 'XP Log', icon: TrendingUp },
          { key: 'badges' as const, label: 'Badges', icon: Award },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Quick stats */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Star className="h-4 w-4 text-primary" /></div>
                <span className="text-sm font-medium">Total XP</span>
              </div>
              <div className="text-2xl font-bold">{(profile?.xp || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><Flame className="h-4 w-4 text-amber-500" /></div>
                <span className="text-sm font-medium">Streak</span>
              </div>
              <div className="text-2xl font-bold">{profile?.streak || 0} days</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><Award className="h-4 w-4 text-emerald-500" /></div>
                <span className="text-sm font-medium">Badges</span>
              </div>
              <div className="text-2xl font-bold">{earnedBadges.length}</div>
            </div>
          </div>
          {/* Recent */}
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <h3 className="font-semibold text-sm mb-3">Recent Activity</h3>
            {xpLog.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No activity yet — start earning XP!</p>
            ) : (
              <div className="space-y-2">
                {xpLog.slice(0, 8).map(entry => {
                  const xi = xpIcon(entry.reason);
                  return (
                    <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-2/50 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${xi.color}`}>
                        <xi.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm capitalize">{entry.reason.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-muted-foreground">{timeAgo(entry.created_at)}</div>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{entry.amount}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* XP Log */}
      {tab === 'xp' && (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          {xpLog.length === 0 ? (
            <div className="p-12 text-center">
              <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No XP entries yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {xpLog.map(entry => {
                const xi = xpIcon(entry.reason);
                return (
                  <div key={entry.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2/30 transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${xi.color}`}>
                      <xi.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium capitalize">{entry.reason.replace(/_/g, ' ')}</div>
                      {entry.reference_type && (
                        <div className="text-xs text-muted-foreground">{entry.reference_type}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{entry.amount}</span>
                      <div className="text-xs text-muted-foreground">{timeAgo(entry.created_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Badges */}
      {tab === 'badges' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BADGES.map(badge => {
            const earned = earnedBadges.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={`rounded-2xl border p-4 transition-all ${
                  earned
                    ? 'border-primary/30 bg-primary/[0.03]'
                    : 'border-border/60 bg-card opacity-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{badge.icon}</div>
                  <div>
                    <div className="font-semibold text-sm">{badge.name}</div>
                    <div className="text-xs text-muted-foreground">{badge.description}</div>
                  </div>
                </div>
                {earned && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Earned
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
