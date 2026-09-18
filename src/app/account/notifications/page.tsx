'use client';

import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Bell, Mail, MessageSquare, Heart, UserPlus, Trophy, BookOpen,
  Settings, Check, X, Zap, Shield, Eye
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

const PREF_ITEMS = [
  { key: 'email_notifications', label: 'Email Notifications', desc: 'Receive notifications via email', icon: Mail, color: 'text-blue-500' },
  { key: 'push_notifications', label: 'Push Notifications', desc: 'Browser push notifications', icon: Zap, color: 'text-amber-500' },
  { key: 'forum_replies', label: 'Forum Replies', desc: 'When someone replies to your posts', icon: MessageSquare, color: 'text-indigo-500' },
  { key: 'quiz_results', label: 'Quiz Results', desc: 'Quiz completion and leaderboard updates', icon: Trophy, color: 'text-purple-500' },
  { key: 'new_followers', label: 'New Followers', desc: 'When someone follows you', icon: UserPlus, color: 'text-emerald-500' },
  { key: 'article_comments', label: 'Article Comments', desc: 'Comments on articles you follow', icon: MessageSquare, color: 'text-pink-500' },
  { key: 'badges_earned', label: 'Badges Earned', desc: 'When you earn a new badge', icon: Trophy, color: 'text-yellow-500' },
  { key: 'weekly_digest', label: 'Weekly Digest', desc: 'Weekly summary of community activity', icon: Mail, color: 'text-cyan-500' },
];

function getNotificationIcon(type: string) {
  switch (type) {
    case 'forum_reply': return { icon: MessageSquare, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' };
    case 'badge_earned': return { icon: Trophy, color: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30' };
    case 'new_follower': return { icon: UserPlus, color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30' };
    case 'comment': return { icon: Heart, color: 'text-pink-500 bg-pink-100 dark:bg-pink-900/30' };
    case 'quiz_result': return { icon: BookOpen, color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30' };
    case 'moderation': return { icon: Shield, color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30' };
    default: return { icon: Bell, color: 'text-primary bg-primary/10' };
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const mountedRef = useRef(true);
  const channelName = useRef(`account_notifications_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`).current;

  const load = (quiet = false) => {
    if (!mountedRef.current) return;
    if (!quiet) setLoading(true);
    fetch('/api/community/notifications')
      .then(r => r.json())
      .then(d => {
        if (mountedRef.current) {
          setNotifications(d.notifications || []);
          if (d.preferences) setPreferences(d.preferences);
          setLoading(false);
        }
      })
      .catch(() => { if (mountedRef.current) setLoading(false); });
  };

  useEffect(() => {
    mountedRef.current = true;
    load();
    const client = createClient();
    const channel = client
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications' }, () => load(true))
      .subscribe();
    const interval = setInterval(() => load(true), 30000);
    const onFocus = () => load(true);
    window.addEventListener('focus', onFocus);
    return () => {
      mountedRef.current = false;
      client.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const markAllRead = async () => {
    await fetch('/api/community/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read_all' }),
    });
    load(true);
  };

  const togglePref = async (key: string) => {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    setSaving(key);
    try {
      await fetch('/api/community/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
    } catch {}
    setTimeout(() => setSaving(null), 500);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Notifications</h2>
          <p className="text-muted-foreground mt-1">Manage your notification preferences and view recent alerts</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="secondary" className="gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {unreadCount} unread
            </Badge>
          )}
          <button
            onClick={() => setShowPrefs(!showPrefs)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-2"
          >
            <Settings className="h-4 w-4" />
            {showPrefs ? 'Hide' : 'Preferences'}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/10"
            >
              <Check className="h-4 w-4" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Preferences Panel */}
      {showPrefs && (
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Notification Preferences</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {PREF_ITEMS.map(item => (
              <div
                key={item.key}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-2/50 hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center ${item.color}`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                </div>
                <button
                  onClick={() => togglePref(item.key)}
                  disabled={saving === item.key}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 disabled:opacity-50 ${
                    preferences[item.key] ? 'bg-primary' : 'bg-surface-2'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      preferences[item.key] ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`}
                    style={{ transform: `translateX(${preferences[item.key] ? '22px' : '2px'})` }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notification List */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border/40">
          <h3 className="font-semibold text-sm">Recent Notifications</h3>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="w-10 h-10 rounded-xl bg-surface-2 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-2 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-surface-2 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mx-auto mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No notifications yet</h3>
            <p className="text-sm text-muted-foreground">They&apos;ll appear here when you get them.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {notifications.map((n) => {
              const ni = getNotificationIcon(n.type);
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-6 py-4 transition-colors hover:bg-surface-2/30 ${
                    !n.is_read ? 'bg-primary/[0.03]' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${ni.color}`}>
                    <ni.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${!n.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    {n.message && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground/60">
                      <Eye className="h-3 w-3" />
                      {timeAgo(n.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
