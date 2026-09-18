'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BADGES } from '@/lib/community-utils';
import Image from 'next/image';
import {
  User, Shield, Bell, Link2, Activity, BookMarked, History, Megaphone,
  LogOut, ChevronRight, Flame, Star, Trophy, Zap, ExternalLink
} from 'lucide-react';

interface AccountSidebarProps {
  profile: any;
  levelInfo: {
    level: number;
    title: string;
    icon: string;
    xpForNext: number;
    progress: number;
  };
}

export const NAV_ITEMS = [
  { href: '/account/activity', label: 'Activity', icon: Activity, description: 'XP log & achievements' },
  { href: '/account', label: 'Profile', icon: User, description: 'Edit your profile' },
  { href: '/account/security', label: 'Security', icon: Shield, description: 'Password & 2FA' },
  { href: '/account/notifications', label: 'Notifications', icon: Bell, description: 'Notification preferences' },
  { href: '/account/connected-accounts', label: 'Connected Accounts', icon: Link2, description: 'OAuth providers' },
  { href: '/account/bookmarks', label: 'Bookmarks', icon: BookMarked, description: 'Saved articles' },
  { href: '/account/history', label: 'Reading History', icon: History, description: 'Articles you read' },
  { href: '/account/ads', label: 'My Ads', icon: Megaphone, description: 'Run & track campaigns' },
];

export default function AccountSidebar({ profile, levelInfo }: AccountSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      {/* Profile Card — Navy gradient header */}
      <Card className="overflow-hidden border-slate-200/60 shadow-sm">
        {/* Cover + avatar area */}
        <div className="relative h-24 bg-gradient-to-br from-slate-950 via-[#0b1035] to-[#1b1b4b]">
          {profile?.cover_url && (
            <Image src={profile.cover_url} alt="" width={400} height={100} className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
        <CardContent className="px-4 pb-4 -mt-10 relative z-10">
          {/* Avatar */}
          <div className="flex items-end gap-3 mb-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-950 to-[#1b1b4b] border-3 border-white flex items-center justify-center text-xl font-bold text-white overflow-hidden shrink-0 shadow-lg">
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt="" width={64} height={64} className="w-full h-full object-cover" />
              ) : (
                <span className="text-amber-400">{profile?.full_name?.[0] || profile?.username?.[0] || '?'}</span>
              )}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <h3 className="font-bold text-sm truncate">{profile?.full_name || profile?.username || 'User'}</h3>
              <p className="text-xs text-muted-foreground truncate">@{profile?.username || 'username'}</p>
            </div>
          </div>

          {/* Level & XP bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="flex items-center gap-1 font-semibold text-slate-800">
                <span className="text-sm">{levelInfo.icon}</span> Level {levelInfo.level}
              </span>
              <span className="text-muted-foreground font-medium">{levelInfo.title}</span>
            </div>
            <div className="relative">
              <Progress value={levelInfo.progress} className="h-2 bg-slate-100" />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
              <span>{(profile?.xp || 0).toLocaleString()} XP</span>
              <span>{levelInfo.xpForNext.toLocaleString()} XP</span>
            </div>
          </div>

          {/* Quick Stats — clean chips */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-base font-bold text-slate-800">{(profile?.xp || 0).toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">XP</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-base font-bold text-orange-500 flex items-center justify-center gap-0.5">
                <Flame className="h-3.5 w-3.5" /> {profile?.streak || 0}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Streak</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-base font-bold text-amber-500">{(profile?.badges || []).length}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Badges</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card className="border-slate-200/60 shadow-sm">
        <CardContent className="p-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/account' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white font-medium shadow-sm'
                    : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                }`}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${isActive ? 'text-white' : ''}`}>{item.label}</div>
                  <div className={`text-xs truncate ${isActive ? 'text-white/60' : 'text-muted-foreground'}`}>{item.description}</div>
                </div>
                <ChevronRight className={`h-3 w-3 ${isActive ? 'text-white/40' : 'text-slate-300'}`} />
              </Link>
            );
          })}
        </CardContent>
      </Card>

      {/* Badges Preview */}
      {(profile?.badges || []).length > 0 && (
        <Card className="border-slate-200/60 shadow-sm">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-slate-700">
              <Trophy className="h-4 w-4 text-amber-500" /> Badges
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(profile?.badges || []).slice(0, 6).map((badgeId: string) => {
                const badge = getBadgeById(badgeId);
                return badge ? (
                  <div key={badgeId} className="flex items-center gap-1 text-xs bg-slate-50 border border-slate-100 px-2 py-1 rounded-full text-slate-700" title={badge.description}>
                    <span>{badge.icon}</span>
                    <span>{badge.name}</span>
                  </div>
                ) : null;
              })}
              {(profile?.badges || []).length > 6 && (
                <div className="text-xs text-muted-foreground px-2 py-1">+{(profile?.badges || []).length - 6} more</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="border-slate-200/60 shadow-sm">
        <CardContent className="p-1.5">
          <Link
            href="/community"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all"
          >
            <Zap className="h-4 w-4 text-slate-400" />
            <span className="flex-1">Community Hub</span>
            <ExternalLink className="h-3 w-3 text-slate-300" />
          </Link>
          <Link
            href={`/u/${profile?.username || ''}`}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all"
          >
            <Star className="h-4 w-4 text-slate-400" />
            <span className="flex-1">View Public Profile</span>
            <ExternalLink className="h-3 w-3 text-slate-300" />
          </Link>
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/';
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-red-50 text-slate-600 hover:text-red-600 transition-all w-full"
          >
            <LogOut className="h-4 w-4 text-slate-400 hover:text-red-500" />
            <span>Sign Out</span>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

function getBadgeById(id: string) {
  const entry = BADGES.find(b => b.id === id);
  return entry ? { name: entry.name, icon: entry.icon, description: entry.description } : undefined;
}