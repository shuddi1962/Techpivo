'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { User, Save, Camera, MapPin, Globe, Link2, CheckCircle2, Loader2 } from 'lucide-react';
import { getLevelForXP } from '@/lib/community-utils';
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
          <div className="h-40 bg-slate-100 rounded-2xl" />
          <div className="h-64 bg-slate-100 rounded-2xl" />
          <div className="h-48 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  const levelInfo = getLevelForXP(profile?.xp || 0);

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
      {/* Profile Header Card */}
      <Card className="overflow-hidden border-slate-200/60 shadow-sm">
        {/* Cover photo */}
        <div className="relative h-32 sm:h-40 bg-gradient-to-br from-slate-950 via-[#0b1035] to-[#1b1b4b]">
          {profile?.cover_url && (
            <Image src={profile.cover_url} alt="Cover" fill unoptimized className="object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
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
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={uploading === 'cover'}
            className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors flex items-center gap-1.5"
          >
            {uploading === 'cover' ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Uploading...</>
            ) : (
              <><Camera className="h-3 w-3" /> Cover Photo</>
            )}
          </button>
        </div>

        {/* Profile info */}
        <CardContent className="px-4 sm:px-6 pb-6 -mt-12 relative z-10">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-slate-950 to-[#1b1b4b] border-4 border-white flex items-center justify-center text-3xl font-bold text-white overflow-hidden shadow-xl">
                {profile?.avatar_url ? (
                  <Image src={profile.avatar_url} alt="" width={112} height={112} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-amber-400">{profile?.full_name?.[0] || profile?.username?.[0] || '?'}</span>
                )}
              </div>
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
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploading === 'avatar'}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 shadow-md transition-colors"
              >
                {uploading === 'avatar' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Name + stats */}
            <div className="flex-1 pt-1 sm:pt-2">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl font-bold">{profile?.full_name || profile?.username || 'User'}</h2>
                <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 border-0">
                  {levelInfo.icon} Level {levelInfo.level} · {levelInfo.title}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">@{profile?.username || 'username'}</p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-slate-700">{(profile?.xp || 0).toLocaleString()}</span> XP
                </span>
                <span className="text-slate-200">·</span>
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-orange-500">{profile?.streak || 0}</span> streak
                </span>
                <span className="text-slate-200">·</span>
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-amber-500">{(profile?.badges || []).length}</span> badges
                </span>
              </div>

              {/* XP progress mini bar */}
              <div className="max-w-xs">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span>XP to next level</span>
                  <span>{(profile?.xp || 0).toLocaleString()} / {levelInfo.xpForNext.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${levelInfo.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Profile Completion */}
          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Profile Completion</span>
              <span className="text-sm font-bold text-amber-500">{completionPct}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {completionItems.map(item => (
                <Badge key={item.label} variant="outline" className={`text-[11px] rounded-full px-2.5 py-0.5 ${item.done ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 border-slate-200'}`}>
                  {item.done ? <CheckCircle2 className="h-3 w-3 mr-1 inline" /> : <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300 mr-1.5 align-middle" />}
                  {item.label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card className="border-slate-200/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-slate-500" /> Basic Information
          </CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-700">Full Name</label>
              <Input
                value={profile?.full_name || ''}
                onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="John Doe"
                className="bg-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-700">Username</label>
              <Input
                value={profile?.username || ''}
                onChange={e => setProfile({ ...profile, username: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
                placeholder="johndoe"
                className="bg-white lowercase"
              />
              <p className="text-xs text-muted-foreground mt-1">Letters, numbers, hyphens and underscores only</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block text-slate-700">Bio</label>
            <Textarea
              value={profile?.bio || ''}
              onChange={e => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell the community about yourself, your interests, and what you're working on..."
              rows={3}
              maxLength={300}
              className="bg-white"
            />
            <p className="text-xs text-muted-foreground mt-1">{(profile?.bio || '').length}/300 characters</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-700 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400" /> Location
              </label>
              <Input
                value={profile?.location || ''}
                onChange={e => setProfile({ ...profile, location: e.target.value })}
                placeholder="Lagos, Nigeria"
                className="bg-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-700 flex items-center gap-1">
                <Globe className="h-3 w-3 text-slate-400" /> Website
              </label>
              <Input
                value={profile?.website || ''}
                onChange={e => setProfile({ ...profile, website: e.target.value })}
                placeholder="https://yourwebsite.com"
                className="bg-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Profiles */}
      <Card className="border-slate-200/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Link2 className="h-5 w-5 text-slate-500" /> Social Profiles
          </CardTitle>
          <CardDescription>Your linked social profiles appear on your public profile</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {SOCIAL_PROVIDERS.map(provider => {
              const url = profile?.social_links?.[provider.id];
              return (
                <div key={provider.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="flex items-center justify-center h-9 w-9 rounded-lg text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: provider.brand || '#333' }}
                    >
                      <BrandIcon id={provider.id} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-700">{provider.name}</div>
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-amber-600 truncate block max-w-[240px]">
                          {url.replace(/^https?:\/\//, '')}
                        </a>
                      ) : (
                        <div className="text-xs text-muted-foreground">Not connected</div>
                      )}
                    </div>
                  </div>
                  {url ? (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 shrink-0 text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-400 border-slate-200 bg-white shrink-0 text-xs">Not connected</Badge>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <Link href="/account/connected-accounts">
              <Button variant="outline" size="sm" className="border-slate-200 text-slate-600 hover:bg-slate-50">
                <Link2 className="h-4 w-4 mr-1" /> Manage social profiles
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Save bar — sticky at bottom */}
      <div className="sticky bottom-4 z-10">
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 shadow-lg">
          <div className="text-sm">
            {saved && (
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Profile saved successfully!
              </span>
            )}
            {!saved && !saving && (
              <span className="text-slate-400">Changes will be saved to your profile</span>
            )}
          </div>
          <Button
            onClick={saveProfile}
            disabled={saving}
            className="bg-slate-900 hover:bg-slate-800 text-white px-6"
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Save Changes</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}