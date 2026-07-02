'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Key, Smartphone, Monitor, AlertTriangle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function SecurityPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [changing, setChanging] = useState(false);
  const [changed, setChanged] = useState(false);

  const sessions = [
    { id: '1', device: 'Chrome on Windows', location: 'Lagos, Nigeria', lastActive: '2 minutes ago', current: true },
    { id: '2', device: 'Safari on iPhone', location: 'Lagos, Nigeria', lastActive: '2 hours ago', current: false },
    { id: '3', device: 'Firefox on Linux', location: 'Abuja, Nigeria', lastActive: '3 days ago', current: false },
  ];

  const changePassword = async () => {
    if (passwords.new !== passwords.confirm) return;
    setChanging(true);
    try {
      await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: passwords.new }),
      });
      setChanged(true);
      setPasswords({ current: '', new: '', confirm: '' });
      setTimeout(() => setChanged(false), 3000);
    } catch (e) {
      console.error('Failed to change password');
    }
    setChanging(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Security Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your password, two-factor authentication, and sessions</p>
      </div>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" /> Change Password
          </CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Current Password</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={passwords.current}
                onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">New Password</label>
            <Input
              type="password"
              value={passwords.new}
              onChange={e => setPasswords({ ...passwords, new: e.target.value })}
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Confirm New Password</label>
            <Input
              type="password"
              value={passwords.confirm}
              onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
              placeholder="Confirm new password"
            />
          </div>
          {passwords.new && passwords.confirm && passwords.new !== passwords.confirm && (
            <p className="text-sm text-destructive">Passwords do not match</p>
          )}
          <div className="flex items-center justify-between">
            {changed && <span className="text-sm text-green-500 font-medium">✓ Password changed successfully!</span>}
            <Button
              onClick={changePassword}
              disabled={changing || !passwords.current || !passwords.new || passwords.new !== passwords.confirm}
            >
              <Key className="h-4 w-4 mr-2" />
              {changing ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" /> Two-Factor Authentication
          </CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Shield className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <div className="font-medium">Authenticator App</div>
                <div className="text-sm text-muted-foreground">Use an authenticator app to generate one-time codes</div>
              </div>
            </div>
            <Badge variant="outline">Not Enabled</Badge>
          </div>
          <Button variant="outline" className="mt-4" disabled>
            <Smartphone className="h-4 w-4 mr-2" /> Enable 2FA (Coming Soon)
          </Button>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" /> Active Sessions
          </CardTitle>
          <CardDescription>Devices currently signed into your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessions.map(session => (
              <div key={session.id} className={`flex items-center justify-between p-4 rounded-lg ${session.current ? 'bg-primary/5 border border-primary/10' : 'bg-muted/30'}`}>
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{session.device}</span>
                      {session.current && <Badge variant="default" className="text-xs">Current</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">{session.location} · {session.lastActive}</div>
                  </div>
                </div>
                {!session.current && (
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Delete Account</div>
              <div className="text-sm text-muted-foreground">Permanently delete your account and all associated data</div>
            </div>
            <Button variant="destructive" size="sm" disabled>
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
