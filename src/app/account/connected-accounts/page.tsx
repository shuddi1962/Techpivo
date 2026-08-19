'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link2, CheckCircle2, ExternalLink, AlertCircle, X, Info } from 'lucide-react';
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
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
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
        if (mountedRef.current) {
          setProviders(d.accounts || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mountedRef.current) setLoading(false);
      });
  };

  useEffect(() => {
    mountedRef.current = true;
    let interval: ReturnType<typeof setInterval> | null = null;
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;
    const supabase = createClient();

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mountedRef.current) return;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `id=eq.${user.id}` },
          () => load(true)
        )
        .subscribe();
    };

    load();
    void setupRealtime();
    interval = setInterval(() => load(true), 30000);
    const onFocus = () => load(true);
    window.addEventListener('focus', onFocus);

    return () => {
      mountedRef.current = false;
      if (interval) clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const connectProvider = async (providerId: string, url: string) => {
    setError('');
    try {
      const res = await fetch('/api/community/connected-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId, url }),
      });
      if (res.ok) {
        setSuccess('Profile link connected successfully');
        setConnectDialog(null);
        load(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to connect account');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
  };

  const disconnectProvider = async (providerId: string) => {
    setError('');
    try {
      const res = await fetch('/api/community/connected-accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId }),
      });
      if (res.ok) {
        setSuccess('Profile link disconnected');
        load(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to disconnect account');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
  };

  const handleConnectClick = (providerId: string, providerName: string) => {
    setConnectDialog({ providerId, providerName });
    setProfileUrl('');
    setError('');
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
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Social Profiles</h2>
          <p className="text-muted-foreground mt-1">Link your social profiles — they appear on your public profile</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{connectedCount} of {providers.length} connected</Badge>
          <Badge variant="outline" className="gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            LIVE
          </Badge>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
          <button onClick={() => setSuccess('')} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="space-y-4">
        {providers.map(provider => {
          const meta = getProviderMeta(provider.id);
          return (
            <Card key={provider.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: meta?.brand || '#333' }}
                    >
                      <BrandIcon id={provider.id} className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{provider.name}</div>
                      {provider.connected ? (
                        <div className="flex items-center gap-1.5 text-sm text-green-500">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                          {provider.url && (
                            <a href={provider.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1 inline-flex items-center gap-1">
                              {hostnameOf(provider.url)} <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Not connected</div>
                      )}
                    </div>
                  </div>
                  <div>
                    {provider.connected ? (
                      <div className="flex gap-2">
                        <Badge variant="secondary">Connected</Badge>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => disconnectProvider(provider.id)}>Disconnect</Button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => handleConnectClick(provider.id, provider.name)}><Link2 className="h-4 w-4 mr-1" /> Connect</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-sm">How it works</div>
            <p className="text-sm text-muted-foreground mt-0.5">
              These links are shown on your public profile so readers can follow you on every platform.
              Paste the URL of your profile or page — no passwords, no OAuth, nothing is ever shared.
            </p>
          </div>
        </CardContent>
      </Card>

      {connectDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setConnectDialog(null)}>
          <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-lg border" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-lg mb-1">Connect {connectDialog.providerName}</h3>
            <p className="text-sm text-muted-foreground mb-4">Enter your profile URL to display on your public profile</p>
            <input
              value={profileUrl}
              onChange={e => setProfileUrl(e.target.value)}
              placeholder={dialogMeta?.placeholder || `https://${connectDialog.providerId}.com/your-profile`}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm mb-4"
              onKeyDown={e => e.key === 'Enter' && profileUrl.trim() && connectProvider(connectDialog.providerId, profileUrl.trim())}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConnectDialog(null)}>Cancel</Button>
              <Button onClick={() => profileUrl.trim() && connectProvider(connectDialog.providerId, profileUrl.trim())} disabled={!profileUrl.trim()}>
                <Link2 className="h-4 w-4 mr-1" /> Connect
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}