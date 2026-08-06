'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link2, CheckCircle2, ExternalLink, AlertCircle, X } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  url: string | null;
}

export default function ConnectedAccountsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [connectDialog, setConnectDialog] = useState<{ providerId: string; providerName: string } | null>(null);
  const [profileUrl, setProfileUrl] = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/community/connected-accounts')
      .then(r => r.json())
      .then(d => {
        setProviders(d.accounts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load() }, []);

  const connectProvider = async (providerId: string, url: string) => {
    setError('');
    try {
      const res = await fetch('/api/community/connected-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId, url }),
      });
      if (res.ok) {
        setSuccess(`${providerId} account connected successfully`);
        setConnectDialog(null);
        load();
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
        setSuccess(`${providerId} account disconnected`);
        load();
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Connected Accounts</h2>
          <p className="text-muted-foreground mt-1">Link your social accounts for easier sign-in</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Connected Accounts</h2>
        <p className="text-muted-foreground mt-1">Link your social accounts for easier sign-in</p>
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
        {providers.map(provider => (
          <Card key={provider.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl">{provider.icon}</div>
                  <div>
                    <div className="font-semibold text-lg">{provider.name}</div>
                    {provider.connected && provider.url ? (
                      <div className="flex items-center gap-1.5 text-sm text-green-500">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                        <a href={provider.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1 inline-flex items-center gap-1">
                          {new URL(provider.url).hostname} <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ) : provider.connected ? (
                      <div className="flex items-center gap-1.5 text-sm text-green-500"><CheckCircle2 className="h-3.5 w-3.5" /> Connected</div>
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
        ))}
      </div>

      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-sm">Why connect accounts?</div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Connecting your social accounts allows you to sign in quickly without entering a password.
              Your account information is used only for authentication and is never shared.
            </p>
          </div>
        </CardContent>
      </Card>

      {connectDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setConnectDialog(null)}>
          <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-lg border" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-lg mb-1">Connect {connectDialog.providerName}</h3>
            <p className="text-sm text-muted-foreground mb-4">Enter your profile URL to display on your account</p>
            <input
              value={profileUrl}
              onChange={e => setProfileUrl(e.target.value)}
              placeholder={`https://${connectDialog.providerId}.com/your-profile`}
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
