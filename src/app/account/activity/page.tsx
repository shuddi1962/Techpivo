'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Star, Trophy, Flame, BookOpen, MessageSquare, Award, Target, Calendar } from 'lucide-react';

interface XpLogEntry {
  id: string;
  action: string;
  xp_amount: number;
  description: string;
  created_at: string;
}

export default function ActivityPage() {
  const [xpLog, setXpLog] = useState<XpLogEntry[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/community/profile').then(r => r.json()),
      fetch('/api/community/xp-log').then(r => r.json()).catch(() => ({ logs: [] })),
    ]).then(([profileData, xpData]) => {
      setProfile(profileData.profile);
      setXpLog(xpData.logs || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const getActionIcon = (action: string) => {
    if (action.includes('quiz')) return <Trophy className="h-4 w-4 text-purple-500" />;
    if (action.includes('comment') || action.includes('forum')) return <MessageSquare className="h-4 w-4 text-blue-500" />;
    if (action.includes('read')) return <BookOpen className="h-4 w-4 text-green-500" />;
    if (action.includes('streak')) return <Flame className="h-4 w-4 text-orange-500" />;
    if (action.includes('badge')) return <Award className="h-4 w-4 text-yellow-500" />;
    if (action.includes('login')) return <Target className="h-4 w-4 text-primary" />;
    return <Star className="h-4 w-4 text-primary" />;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      read_article: 'Read Article',
      complete_profile: 'Complete Profile',
      comment_approved: 'Comment Approved',
      forum_answer: 'Forum Answer',
      forum_post: 'Forum Post',
      complete_quiz: 'Complete Quiz',
      share_article: 'Share Article',
      daily_login: 'Daily Login',
      newsletter_subscribe: 'Newsletter Subscribe',
      first_post: 'First Post',
      follow_user: 'Follow User',
      bookmark: 'Bookmark',
      streak_bonus: 'Streak Bonus',
    };
    return labels[action] || action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-48 bg-muted rounded-lg" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  const totalXp = profile?.xp || 0;
  const streak = profile?.streak || 0;
  const badges = profile?.badges || [];

  // Calculate stats from XP log
  const todayXp = xpLog.filter(l => {
    const d = new Date(l.created_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).reduce((sum, l) => sum + l.xp_amount, 0);

  const weekXp = xpLog.filter(l => {
    const d = new Date(l.created_at);
    const week = new Date();
    week.setDate(week.getDate() - 7);
    return d >= week;
  }).reduce((sum, l) => sum + l.xp_amount, 0);

  const monthXp = xpLog.filter(l => {
    const d = new Date(l.created_at);
    const month = new Date();
    month.setMonth(month.getMonth() - 1);
    return d >= month;
  }).reduce((sum, l) => sum + l.xp_amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Activity & Achievements</h2>
        <p className="text-muted-foreground mt-1">Track your XP earnings, streaks, and milestones</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total XP', value: totalXp.toLocaleString(), icon: Star, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Day Streak', value: `${streak} days`, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: 'Badges', value: badges.length.toString(), icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
          { label: 'Today XP', value: `+${todayXp}`, icon: Activity, color: 'text-green-500', bg: 'bg-green-500/10' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <div className={`w-10 h-10 rounded-full ${stat.bg} flex items-center justify-center mx-auto mb-2`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* XP Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" /> XP Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <div className="text-2xl font-bold text-primary">+{todayXp}</div>
              <div className="text-sm text-muted-foreground">Today</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <div className="text-2xl font-bold text-blue-500">+{weekXp}</div>
              <div className="text-sm text-muted-foreground">This Week</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <div className="text-2xl font-bold text-purple-500">+{monthXp}</div>
              <div className="text-sm text-muted-foreground">This Month</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      {badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" /> Earned Badges ({badges.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {badges.map((badgeId: string) => {
                const badge = getBadgeInfo(badgeId);
                return badge ? (
                  <div key={badgeId} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="text-2xl">{badge.icon}</div>
                    <div>
                      <div className="font-medium text-sm">{badge.name}</div>
                      <div className="text-xs text-muted-foreground">{badge.description}</div>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* XP Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" /> XP History
          </CardTitle>
          <CardDescription>Your recent XP earnings</CardDescription>
        </CardHeader>
        <CardContent>
          {xpLog.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2" />
              <p>No XP history yet. Start reading, commenting, and quizzing to earn XP!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {xpLog.slice(0, 20).map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30">
                  {getActionIcon(entry.action)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{getActionLabel(entry.action)}</div>
                    {entry.description && (
                      <div className="text-xs text-muted-foreground truncate">{entry.description}</div>
                    )}
                  </div>
                  <Badge variant="default" className="shrink-0">+{entry.xp_amount} XP</Badge>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getBadgeInfo(id: string) {
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
