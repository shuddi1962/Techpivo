'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { User, Save, Camera, MapPin, Globe, Link2, CheckCircle2 } from 'lucide-react';
import { SOCIAL_PROVIDERS } from '@/lib/social-providers';
import BrandIcon from '@/lib/social-icons';

export default function AccountPage() {
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<'avatar' | 'cover' | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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

  const uploadImage = async (field: 'avatar_url' | 'cover_url', file: File) => {
    setUploading(field === 'avatar_url' ? 'avatar' : 'cover');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data?.url) {
        setProfile({ ...profile, [field]: data.url });
      } else {
        alert(data?.error || 'Upload failed. Please try a different image.');
      }
    } catch (e) {
      console.error('Upload failed', e);
      alert('Upload failed. Please try again.');
    }
    setUploading(null);
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
                <Image src={profile.avatar_url} alt="" width={48} height={48} className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.[0] || profile?.username?.[0] || '?'
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">
                Upload a profile photo to personalize your account. Click the button to change.
              </p>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage('avatar_url', file);
                  e.target.value = '';
                }}
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()} disabled={uploading === 'avatar'}>
                  <Camera className="h-4 w-4 mr-1" />
                  {uploading === 'avatar' ? 'Uploading...' : 'Upload Photo'}
                </Button>
                {profile?.avatar_url && (
                  <Button variant="ghost" size="sm" onClick={() => setProfile({ ...profile, avatar_url: null })}>
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">JPG, PNG, GIF, WEBP or AVIF — up to 8 MB.</p>
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
            <label className="text-sm font-medium mb-1.5 block">Cover Photo</label>
            <div className="relative aspect-[21/9] rounded-lg overflow-hidden border border-border bg-muted/40 mb-2">
              {profile?.cover_url ? (
                <Image src={profile.cover_url} alt="Cover" fill unoptimized className="object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  No cover photo
                </div>
              )}
              {profile?.cover_url && (
                <button
                  type="button"
                  onClick={() => setProfile({ ...profile, cover_url: null })}
                  className="absolute top-2 right-2 bg-slate-900/70 text-white text-xs px-2 py-1 rounded-md hover:bg-slate-900"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) uploadImage('cover_url', file);
                e.target.value = '';
              }}
            />
            <Button variant="outline" size="sm" onClick={() => coverInputRef.current?.click()} disabled={uploading === 'cover'}>
              <Camera className="h-4 w-4 mr-1" />
              {uploading === 'cover' ? 'Uploading...' : 'Upload Cover'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Social Profiles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Social Profiles
          </CardTitle>
          <CardDescription>Your linked social profiles appear on your public profile</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {SOCIAL_PROVIDERS.map(provider => {
              const url = profile?.social_links?.[provider.id];
              return (
                <div key={provider.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="flex items-center justify-center h-8 w-8 rounded-lg text-white shrink-0"
                      style={{ backgroundColor: provider.brand || '#333' }}
                    >
                      <BrandIcon id={provider.id} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{provider.name}</div>
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary truncate block max-w-[240px]">
                          {url.replace(/^https?:\/\//, '')}
                        </a>
                      ) : (
                        <div className="text-xs text-muted-foreground">Not connected</div>
                      )}
                    </div>
                  </div>
                  {url ? (
                    <Badge variant="outline" className="text-green-600 border-green-500/30 bg-green-500/10 shrink-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground shrink-0">Not connected</Badge>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <Link href="/account/connected-accounts">
              <Button variant="outline" size="sm">
                <Link2 className="h-4 w-4 mr-1" /> Manage social profiles
              </Button>
            </Link>
          </div>
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
