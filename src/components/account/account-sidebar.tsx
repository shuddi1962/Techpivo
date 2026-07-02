'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  User, Shield, Bell, Link2, Activity, BookMarked, History,
  Settings, LogOut, ChevronRight, Flame, Star, Trophy, Zap
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

const NAV_ITEMS = [
  { href: '/account', label: 'Profile', icon: User, description: 'Edit your profile' },
  { href: '/account/security', label: 'Security', icon: Shield, description: 'Password & 2FA' },
  { href: '/account/notifications', label: 'Notifications', icon: Bell, description: 'Notification preferences' },
  { href: '/account/connected-accounts', label: 'Connected Accounts', icon: Link2, description: 'OAuth providers' },
  { href: '/account/activity', label: 'Activity', icon: Activity, description: 'XP log & achievements' },
  { href: '/account/bookmarks', label: 'Bookmarks', icon: BookMarked, description: 'Saved articles' },
  { href: '/account/history', label: 'Reading History', icon: History, description: 'Articles you read' },
];

export default function AccountSidebar({ profile, levelInfo }: AccountSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/20 to-primary/5 relative">
          {profile?.cover_url && (
            <img src={profile.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
        </div>
        <CardContent className="p-4 -mt-8 relative z-10">
          <div className="flex items-end gap-3 mb-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-xl font-bold text-primary overflow-hidden shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.[0] || profile?.username?.[0] || '?'
              )}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <h3 className="font-semibold truncate">{profile?.full_name || profile?.username || 'User'}</h3>
              <p className="text-sm text-muted-foreground truncate">@{profile?.username || 'username'}</p>
            </div>
          </div>

          {/* Level & XP */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-1 font-medium">
                <span>{levelInfo.icon}</span> Level {levelInfo.level}
              </span>
              <span className="text-muted-foreground">{levelInfo.title}</span>
            </div>
            <Progress value={levelInfo.progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{(profile?.xp || 0).toLocaleString()} XP</span>
              <span>{levelInfo.xpForNext.toLocaleString()} XP</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-muted/50">
              <div className="text-lg font-bold text-primary">{(profile?.xp || 0).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">XP</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <div className="text-lg font-bold text-orange-500 flex items-center justify-center gap-0.5">
                <Flame className="h-4 w-4" /> {profile?.streak || 0}
              </div>
              <div className="text-xs text-muted-foreground">Streak</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <div className="text-lg font-bold text-yellow-500">{(profile?.badges || []).length}</div>
              <div className="text-xs text-muted-foreground">Badges</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent className="p-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/account' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              </Link>
            );
          })}
        </CardContent>
      </Card>

      {/* Badges Preview */}
      {(profile?.badges || []).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-yellow-500" /> Badges
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(profile?.badges || []).slice(0, 6).map((badgeId: string) => {
                const badge = getBadgeById(badgeId);
                return badge ? (
                  <div key={badgeId} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full" title={badge.description}>
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
      <Card>
        <CardContent className="p-2">
          <Link
            href="/community"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Zap className="h-4 w-4" />
            <span>Community Hub</span>
          </Link>
          <Link
            href={`/u/${profile?.username || ''}`}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Star className="h-4 w-4" />
            <span>View Public Profile</span>
          </Link>
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/';
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

function getBadgeById(id: string) {
  const badges: Record<string, { name: string; icon: string; description: string }> = {
    early_member: { name: 'Early Member', icon: '🔥', description: 'Joined during the first year' },
    programmer: { name: 'Programmer', icon: '💻', description: 'Read 20 programming articles' },
    ai_expert: { name: 'AI Expert', icon: '🤖', description: 'Read 20 AI articles' },
    cyber_pro: { name: 'Cybersecurity Pro', icon: '🛡', description: 'Read 20 cybersecurity articles' },
    gadget_lover: { name: 'Gadget Lover', icon: '📱', description: 'Read 15 gadget reviews' },
    tutorial_master: { name: 'Tutorial Master', icon: '🎓', description: 'Completed 10 tutorials' },
    quiz_champion: { name: 'Quiz Champion', icon: '🏆', description: 'Scored 100% on 5 quizzes' },
    top_commenter: { name: 'Top Commenter', icon: '⭐', description: '50 comments with 10+ likes' },
    community_helper: { name: 'Community Helper', icon: '💬', description: '20 accepted forum answers' },
    daily_visitor: { name: 'Daily Visitor', icon: '🚀', description: '30-day login streak' },
    first_post: { name: 'First Post', icon: '📝', description: 'Created first forum post' },
    quiz_beginner: { name: 'Quiz Beginner', icon: '🎯', description: 'Completed 1 quiz' },
    knowledge_seeker: { name: 'Knowledge Seeker', icon: '📚', description: 'Read 50 articles' },
    social_butterfly: { name: 'Social Butterfly', icon: '🦋', description: 'Followed 10 users' },
    bookmark_collector: { name: 'Bookmark Collector', icon: '🔖', description: 'Saved 25 bookmarks' },
  };
  return badges[id];
}
