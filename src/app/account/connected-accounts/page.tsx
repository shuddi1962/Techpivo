'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link2, CheckCircle2, ExternalLink, AlertCircle } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  email?: string;
  lastSync?: string;
}

export default function ConnectedAccountsPage() {
  const [providers, setProviders] = useState<Provider[]>([
    { id: 'google', name: 'Google', icon: '🔵', connected: false },
    { id: 'github', name: 'GitHub', icon: '⚫', connected: false },
    { id: 'twitter', name: 'X (Twitter)', icon: '🐦', connected: false },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/community/profile')
      .then(r => r.json())
      .then(d => {
        if (d.profile?.social_links) {
          setProviders(prev => prev.map(p => ({
            ...p,
            connected: !!d.profile.social_links[p.id],
            email: d.profile.social_links[p.id] || undefined,
          })));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const connectProvider = async (providerId: string) => {
    if (providerId === 'google' || providerId === 'github') {
      window.location.href = `/auth/callback?provider=${providerId}`;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Connected Accounts</h2>
        <p className="text-muted-foreground mt-1">Link your social accounts for easier sign-in</p>
      </div>

      <div className="space-y-4">
        {providers.map(provider => (
          <Card key={provider.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl">
                    {provider.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{provider.name}</div>
                    {provider.connected ? (
                      <div className="flex items-center gap-1.5 text-sm text-green-500">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                        {provider.email && <span className="text-muted-foreground ml-1">({provider.email})</span>}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Not connected</div>
                    )}
                  </div>
                </div>
                <div>
                  {provider.connected ? (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled>Connected</Button>
                      <Button variant="ghost" size="sm" className="text-destructive">Disconnect</Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => connectProvider(provider.id)}>
                      <Link2 className="h-4 w-4 mr-1" /> Connect
                    </Button>
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
    </div>
  );
}
