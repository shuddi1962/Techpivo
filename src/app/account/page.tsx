'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Bookmark, History, Settings, Bell, Shield, Star, BookOpen, MessageSquare } from 'lucide-react';

export default function AccountPage() {
  const [profile, setProfile] = useState<any>(null);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/community/profile').then(r => r.json()).then(d => setProfile(d.profile));
    fetch('/api/community/bookmarks').then(r => r.json()).then(d => setBookmarks(d.bookmarks || []));
    fetch('/api/community/history').then(r => r.json()).then(d => setHistory(d.history || []));
    fetch('/api/community/notifications').then(r => r.json()).then(d => setNotifications(d.notifications || []));
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    await fetch('/api/community/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Account</h1>

        <Tabs defaultValue="profile">
          <TabsList className="mb-6">
            <TabsTrigger value="profile"><User className="h-4 w-4 mr-1" /> Profile</TabsTrigger>
            <TabsTrigger value="bookmarks"><Bookmark className="h-4 w-4 mr-1" /> Bookmarks</TabsTrigger>
            <TabsTrigger value="history"><History className="h-4 w-4 mr-1" /> History</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1" /> Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Full Name</label>
                    <Input
                      value={profile?.full_name || ''}
                      onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Username</label>
                    <Input
                      value={profile?.username || ''}
                      onChange={e => setProfile({ ...profile, username: e.target.value })}
                      placeholder="username"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Bio</label>
                  <Textarea
                    value={profile?.bio || ''}
                    onChange={e => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Location</label>
                    <Input
                      value={profile?.location || ''}
                      onChange={e => setProfile({ ...profile, location: e.target.value })}
                      placeholder="City, Country"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Website</label>
                    <Input
                      value={profile?.website || ''}
                      onChange={e => setProfile({ ...profile, website: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <Button onClick={saveProfile} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookmarks">
            <Card>
              <CardHeader>
                <CardTitle>Saved Items</CardTitle>
              </CardHeader>
              <CardContent>
                {bookmarks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bookmark className="h-8 w-8 mx-auto mb-2" />
                    <p>No bookmarks yet. Save articles, tutorials, and tools to find them here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookmarks.map((b) => (
                      <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50">
                        <Badge variant="outline">{b.item_type}</Badge>
                        <span className="flex-1 truncate">{b.title || b.item_id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Reading History</CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-8 w-8 mx-auto mb-2" />
                    <p>No reading history yet. Start reading articles to track your progress.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((h) => (
                      <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 truncate">{h.title || h.post_id}</span>
                        <Badge variant={h.completed ? 'default' : 'secondary'}>
                          {h.completed ? 'Completed' : `${h.progress}%`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2" />
                    <p>No notifications yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((n) => (
                      <div key={n.id} className={`p-3 rounded-lg ${n.is_read ? 'bg-muted/30' : 'bg-primary/5 border border-primary/10'}`}>
                        <div className="font-medium text-sm">{n.title}</div>
                        {n.message && <div className="text-sm text-muted-foreground mt-1">{n.message}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
