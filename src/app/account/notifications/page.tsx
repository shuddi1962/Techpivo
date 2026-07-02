'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, MessageSquare, Heart, UserPlus, Trophy, BookOpen, Settings, Check } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    push_notifications: true,
    forum_replies: true,
    quiz_results: true,
    new_followers: true,
    article_comments: true,
    badges_earned: true,
    weekly_digest: true,
  });

  useEffect(() => {
    fetch('/api/community/notifications')
      .then(r => r.json())
      .then(d => {
        setNotifications(d.notifications || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'forum_reply': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'badge_earned': return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'new_follower': return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'comment': return <Heart className="h-4 w-4 text-red-500" />;
      case 'quiz_result': return <BookOpen className="h-4 w-4 text-purple-500" />;
      default: return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Notifications</h2>
        <p className="text-muted-foreground mt-1">Manage your notification preferences and view recent alerts</p>
      </div>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> Notification Preferences
          </CardTitle>
          <CardDescription>Choose what notifications you receive</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { key: 'email_notifications', label: 'Email Notifications', desc: 'Receive notifications via email', icon: Mail },
              { key: 'push_notifications', label: 'Push Notifications', desc: 'Browser push notifications', icon: Bell },
              { key: 'forum_replies', label: 'Forum Replies', desc: 'When someone replies to your posts', icon: MessageSquare },
              { key: 'quiz_results', label: 'Quiz Results', desc: 'Quiz completion and leaderboard updates', icon: Trophy },
              { key: 'new_followers', label: 'New Followers', desc: 'When someone follows you', icon: UserPlus },
              { key: 'article_comments', label: 'Article Comments', desc: 'Comments on articles you follow', icon: MessageSquare },
              { key: 'badges_earned', label: 'Badges Earned', desc: 'When you earn a new badge', icon: Trophy },
              { key: 'weekly_digest', label: 'Weekly Digest', desc: 'Weekly summary of community activity', icon: Mail },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                </div>
                <button
                  onClick={() => setPreferences({ ...preferences, [item.key]: !preferences[item.key as keyof typeof preferences] })}
                  className={`w-10 h-6 rounded-full transition-colors ${
                    preferences[item.key as keyof typeof preferences] ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    preferences[item.key as keyof typeof preferences] ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2" />
              <p>No notifications yet. They&apos;ll appear here when you get them.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg ${n.is_read ? 'bg-muted/20' : 'bg-primary/5 border border-primary/10'}`}>
                  <div className="mt-0.5">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{n.title}</div>
                    {n.message && <div className="text-sm text-muted-foreground mt-0.5">{n.message}</div>}
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
