'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { User, Save, Camera, MapPin, Globe, Calendar, Flame, Star, Trophy, Target } from 'lucide-react';

export default function AccountPage() {
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/community/profile')
      .then(r => r.json())
      .then(d => {
        setProfile(d.profile);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/community/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error('Failed to save profile', e);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  const completionItems = [
    { label: 'Full Name', done: !!profile?.full_name },
    { label: 'Username', done: !!profile?.username },
    { label: 'Bio', done: !!profile?.bio },
    { label: 'Location', done: !!profile?.location },
    { label: 'Website', done: !!profile?.website },
    { label: 'Avatar', done: !!profile?.avatar_url },
  ];
  const completionPct = Math.round((completionItems.filter(i => i.done).length / completionItems.length) * 100);

  return (
    <div className="space-y-6">
      {/* Profile Completion */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Profile Completion</span>
            <span className="text-sm font-bold text-primary">{completionPct}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {completionItems.map(item => (
              <Badge key={item.label} variant={item.done ? 'default' : 'outline'} className="text-xs">
                {item.done ? '✓' : '○'} {item.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> Profile Photo
          </CardTitle>
          <CardDescription>Your avatar appears across the community</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-3xl font-bold text-primary overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.[0] || profile?.username?.[0] || '?'
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">
                Upload a profile photo to personalize your account. Click the button to change.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const url = prompt('Enter image URL for your avatar:');
                  if (url) setProfile({ ...profile, avatar_url: url });
                }}>
                  <Camera className="h-4 w-4 mr-1" /> Upload Photo
                </Button>
                {profile?.avatar_url && (
                  <Button variant="ghost" size="sm" onClick={() => setProfile({ ...profile, avatar_url: null })}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Basic Information
          </CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Full Name</label>
              <Input
                value={profile?.full_name || ''}
                onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Username</label>
              <Input
                value={profile?.username || ''}
                onChange={e => setProfile({ ...profile, username: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
                placeholder="johndoe"
                className="lowercase"
              />
              <p className="text-xs text-muted-foreground mt-1">Letters, numbers, hyphens and underscores only</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Bio</label>
            <Textarea
              value={profile?.bio || ''}
              onChange={e => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell the community about yourself, your interests, and what you're working on..."
              rows={3}
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground mt-1">{(profile?.bio || '').length}/300 characters</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Location
              </label>
              <Input
                value={profile?.location || ''}
                onChange={e => setProfile({ ...profile, location: e.target.value })}
                placeholder="Lagos, Nigeria"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block flex items-center gap-1">
                <Globe className="h-3 w-3" /> Website
              </label>
              <Input
                value={profile?.website || ''}
                onChange={e => setProfile({ ...profile, website: e.target.value })}
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Cover Photo URL</label>
            <Input
              value={profile?.cover_url || ''}
              onChange={e => setProfile({ ...profile, cover_url: e.target.value })}
              placeholder="https://example.com/cover.jpg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
          <CardDescription>Connect your social profiles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {['twitter', 'github', 'linkedin', 'youtube', 'facebook', 'instagram'].map(platform => (
            <div key={platform}>
              <label className="text-sm font-medium mb-1.5 block capitalize">{platform}</label>
              <Input
                value={profile?.social_links?.[platform] || ''}
                onChange={e => setProfile({
                  ...profile,
                  social_links: { ...(profile?.social_links || {}), [platform]: e.target.value }
                })}
                placeholder={`https://${platform}.com/yourusername`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {saved && <span className="text-green-500 font-medium">✓ Profile saved successfully!</span>}
        </div>
        <Button onClick={saveProfile} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
