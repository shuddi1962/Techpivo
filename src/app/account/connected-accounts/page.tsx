'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Link2, CheckCircle2, ExternalLink, AlertCircle, X, Info,
  Globe, ArrowRight, CircleDot
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getProviderMeta } from '@/lib/social-providers';
import BrandIcon from '@/lib/social-icons';

interface Provider {
  id: string;
  name: string;
  connected: boolean;
  url: string | null;
}

function hostnameOf(url: string | null): string {
  if (!url) return '';
  try { return new URL(url).hostname; } catch { return ''; }
}

export default function ConnectedAccountsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [connectDialog, setConnectDialog] = useState<{ providerId: string; providerName: string } | null>(null);
  const [profileUrl, setProfileUrl] = useState('');
  const mountedRef = useRef(true);
  const channelName = useRef(`account_socials_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`).current;

  const load = (quiet = false) => {
    if (!mountedRef.current) return;
    if (!quiet) setLoading(true);
    fetch('/api/community/connected-accounts')
      .then(r => r.json())
      .then(d => {
        if (mountedRef.current) { setProviders(d.accounts || []); setLoading(false); }
      })
      .catch(() => { if (mountedRef.current) setLoading(false); });
  };

  useEffect(() => {
    mountedRef.current = true;
    load();
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mountedRef.current) return;
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `id=eq.${user.id}` }, () => load(true))
        .subscribe();
    };
    void setupRealtime();
    const interval = setInterval(() => load(true), 30000);
    const onFocus = () => load(true);
    window.addEventListener('focus', onFocus);
    return () => {
      mountedRef.current = false;
      if (channel) supabase.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const connectProvider = async (providerId: string, url: string) => {
    setError('');
    const res = await fetch('/api/community/connected-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: providerId, url }),
    });
    if (res.ok) {
      setSuccess('Profile link connected successfully');
      setConnectDialog(null);
      load(true);
      setTimeout(() => setSuccess(''), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to connect account');
    }
  };

  const disconnectProvider = async (providerId: string) => {
    setError('');
    const res = await fetch('/api/community/connected-accounts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: providerId }),
    });
    if (res.ok) {
      setSuccess('Profile link disconnected');
      load(true);
      setTimeout(() => setSuccess(''), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to disconnect account');
    }
  };

  const connectedCount = providers.filter(p => p.connected).length;
  const dialogMeta = connectDialog ? getProviderMeta(connectDialog.providerId) : undefined;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Social Profiles</h2>
          <p className="text-muted-foreground mt-1">Link your social profiles — they appear on your public profile</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-surface-2 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Social Profiles</h2>
          <p className="text-muted-foreground mt-1">Link your social profiles — they appear on your public profile</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            {connectedCount}/{providers.length} connected
          </Badge>
          <Badge variant="outline" className="gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            LIVE
          </Badge>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')}><X className="h-4 w-4" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Connected providers */}
      <div className="grid sm:grid-cols-2 gap-3">
        {providers.map(provider => {
          const meta = getProviderMeta(provider.id);
          return (
            <div
              key={provider.id}
              className={`rounded-2xl border transition-all p-4 ${
                provider.connected
                  ? 'border-emerald-200 dark:border-emerald-800/30 bg-emerald-50/30 dark:bg-emerald-950/10'
                  : 'border-border/60 bg-card hover:border-border hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                  style={{ backgroundColor: meta?.brand || '#333' }}
                >
                  <BrandIcon id={provider.id} className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{provider.name}</div>
                  {provider.connected && provider.url ? (
                    <a
                      href={provider.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
                    >
                      <Globe className="h-3 w-3" />
                      {hostnameOf(provider.url)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <div className="text-xs text-muted-foreground mt-0.5">Not connected</div>
                  )}
                </div>
                {provider.connected ? (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-xs gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                      <CheckCircle2 className="h-3 w-3" /> Connected
                    </Badge>
                    <button
                      onClick={() => disconnectProvider(provider.id)}
                      className="text-xs text-destructive hover:text-destructive/80 px-2 py-1 rounded-lg hover:bg-destructive/10 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setConnectDialog({ providerId: provider.id, providerName: provider.name }); setProfileUrl(''); setError(''); }}
                    className="shrink-0"
                  >
                    <Link2 className="h-3.5 w-3.5 mr-1" /> Connect
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-blue-200/60 dark:border-blue-800/30 bg-blue-50/50 dark:bg-blue-950/15 p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="font-medium text-sm">How it works</div>
            <p className="text-sm text-muted-foreground mt-0.5">
              These links are shown on your public profile so readers can follow you on every platform.
              Paste the URL of your profile or page — no passwords, no OAuth, nothing is ever shared.
            </p>
          </div>
        </div>
      </div>

      {/* Connect Dialog */}
      {connectDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setConnectDialog(null)}>
          <div
            className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl border border-border/60"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: dialogMeta?.brand || '#333' }}
              >
                <BrandIcon id={connectDialog.providerId} className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Connect {connectDialog.providerName}</h3>
                <p className="text-xs text-muted-foreground">Enter your profile URL to display on your public profile</p>
              </div>
            </div>
            <Input
              value={profileUrl}
              onChange={e => setProfileUrl(e.target.value)}
              placeholder={dialogMeta?.placeholder || `https://${connectDialog.providerId}.com/your-profile`}
              className="mb-4"
              onKeyDown={e => e.key === 'Enter' && profileUrl.trim() && connectProvider(connectDialog.providerId, profileUrl.trim())}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConnectDialog(null)}>Cancel</Button>
              <Button
                onClick={() => profileUrl.trim() && connectProvider(connectDialog.providerId, profileUrl.trim())}
                disabled={!profileUrl.trim()}
              >
                <Link2 className="h-4 w-4 mr-1" /> Connect
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
