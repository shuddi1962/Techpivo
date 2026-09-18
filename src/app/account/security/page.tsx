'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Shield, AlertTriangle, Trash2, Key, Smartphone, History,
  Eye, EyeOff, CheckCircle2, Lock, X
} from 'lucide-react';

export default function SecurityPage() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error' | ''>('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMsgType(type);
    setTimeout(() => { setMessage(''); setMsgType(''); }, 5000);
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) { showMessage('New passwords do not match', 'error'); return; }
    if (passwords.new.length < 6) { showMessage('New password must be at least 6 characters', 'error'); return; }
    setChangingPassword(true);
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient();
      const { error } = await supabase.auth.updateUser({ password: passwords.new });
      if (!error) {
        showMessage('Password changed successfully', 'success');
        setShowPasswordForm(false);
        setPasswords({ current: '', new: '', confirm: '' });
      } else {
        showMessage(error.message || 'Failed to change password', 'error');
      }
    } catch { showMessage('Error changing password', 'error'); }
    setChangingPassword(false);
  };

  const handleDeleteSubmit = async () => {
    if (deleteInput !== 'DELETE') { showMessage('Please type exactly "DELETE" to confirm.', 'error'); return; }
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      });
      const result = await response.json();
      if (result.success) {
        showMessage('Account deletion request submitted. You will be signed out shortly.', 'success');
        setShowDeleteDialog(false); setDeleteInput('');
      } else {
        showMessage(result.error || 'Failed to delete account', 'error');
        setShowDeleteDialog(false);
      }
    } catch (err) {
      showMessage(`Error: ${err instanceof Error ? err.message : 'Something went wrong'}`, 'error');
      setShowDeleteDialog(false);
    }
  };

  const passwordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strengthLabel = (score: number) => {
    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '20%' };
    if (score <= 2) return { label: 'Fair', color: 'bg-orange-500', width: '40%' };
    if (score <= 3) return { label: 'Good', color: 'bg-amber-500', width: '60%' };
    if (score <= 4) return { label: 'Strong', color: 'bg-emerald-500', width: '80%' };
    return { label: 'Very Strong', color: 'bg-emerald-600', width: '100%' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Security</h2>
        <p className="text-muted-foreground mt-1">Manage your account security and sensitive actions</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-xl text-sm ${
          msgType === 'error'
            ? 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
        }`}>
          {msgType === 'error' ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{message}</span>
          <button onClick={() => { setMessage(''); setMsgType(''); }} className="ml-auto opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showDeleteDialog ? (
        /* Delete Confirmation */
        <div className="rounded-2xl border-2 border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-950/20 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Confirm Account Deletion</h3>
              <p className="text-sm text-red-600/70 dark:text-red-400/70">This action is irreversible. All your data will be permanently removed.</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-red-200/50 dark:border-red-800/30">
            <p className="text-sm text-muted-foreground mb-3">Type <strong className="text-foreground">DELETE</strong> in the box below to confirm:</p>
            <Input
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              className="border-red-300 dark:border-red-700 focus-visible:ring-red-500 font-mono"
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="destructive"
              onClick={handleDeleteSubmit}
              disabled={deleteInput !== 'DELETE'}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Permanently Delete My Account
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowDeleteDialog(false); setDeleteInput(''); setMessage(''); setMsgType(''); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Password & Authentication */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Password & Authentication</h3>
                <p className="text-sm text-muted-foreground">Manage your login credentials and security settings</p>
              </div>
            </div>

            {/* Password Row */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-2/50 hover:bg-surface-2 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Key className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-medium">Password</div>
                  <div className="text-xs text-muted-foreground">Change your account password</div>
                </div>
              </div>
              <Button
                variant={showPasswordForm ? 'ghost' : 'outline'}
                size="sm"
                onClick={() => { setShowPasswordForm(!showPasswordForm); setPasswords({ current: '', new: '', confirm: '' }); }}
              >
                {showPasswordForm ? 'Cancel' : 'Change'}
              </Button>
            </div>

            {/* Password Form */}
            {showPasswordForm && (
              <div className="rounded-xl border border-border/40 bg-surface-2/30 p-5 space-y-4">
                {/* Current */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Current Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={passwords.current}
                      onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                      placeholder="Enter current password"
                      className="pl-9 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {/* New */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showNewPw ? 'text' : 'password'}
                      value={passwords.new}
                      onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                      placeholder="Enter new password (min 6 characters)"
                      className="pl-9 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {passwords.new.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${strengthLabel(passwordStrength(passwords.new)).color}`}
                          style={{ width: strengthLabel(passwordStrength(passwords.new)).width }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{strengthLabel(passwordStrength(passwords.new)).label}</p>
                    </div>
                  )}
                </div>
                {/* Confirm */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showConfirmPw ? 'text' : 'password'}
                      value={passwords.confirm}
                      onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                      placeholder="Re-enter new password"
                      className="pl-9 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwords.confirm.length > 0 && passwords.new !== passwords.confirm && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !passwords.current || !passwords.new || !passwords.confirm}
                  className="w-full sm:w-auto"
                >
                  {changingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            )}

            {/* 2FA Row */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-2/50 hover:bg-surface-2 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-medium">Two-Factor Authentication</div>
                  <div className="text-xs text-muted-foreground">Add an extra layer of security to your account</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground bg-surface-2 px-2 py-1 rounded-md">Coming Soon</span>
                <Button variant="outline" size="sm" disabled className="opacity-50">Enable</Button>
              </div>
            </div>

            {/* Active Sessions Row */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-2/50 hover:bg-surface-2 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <History className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-medium">Active Sessions</div>
                  <div className="text-xs text-muted-foreground">Manage devices where you&apos;re currently logged in</div>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled className="opacity-50">View</Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-2xl border-2 border-red-200/60 dark:border-red-800/30 bg-red-50/30 dark:bg-red-950/10 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-red-700 dark:text-red-400">Danger Zone</h3>
                <p className="text-sm text-red-600/60 dark:text-red-400/60">Once you delete your account, there is no going back. Please be certain.</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-red-200/50 dark:border-red-800/20">
              <div>
                <div className="text-sm font-medium text-red-700 dark:text-red-400">Delete Account</div>
                <div className="text-xs text-red-500/70 dark:text-red-400/70">Permanently remove your account and all associated data</div>
              </div>
              <Button variant="destructive" onClick={() => { setShowDeleteDialog(true); setDeleteInput(''); setMessage(''); setMsgType(''); }}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete Account
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
