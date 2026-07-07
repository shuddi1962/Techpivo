'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, AlertTriangle, Trash2, Key, Smartphone, History } from 'lucide-react';

export default function SecurityPage() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [message, setMessage] = useState('');

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
    setDeleteInput('');
    setMessage('');
  };

  const handleDeleteSubmit = async () => {
    if (deleteInput !== 'DELETE') {
      setMessage('Please type exactly "DELETE" to confirm.');
      return;
    }

    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const result = await response.json();
      if (result.success) {
        setMessage('Account deletion request submitted. You will be signed out shortly.');
        setShowDeleteDialog(false);
        setDeleteInput('');
      } else {
        setMessage(result.error || 'Failed to delete account');
        setShowDeleteDialog(false);
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Something went wrong'}`);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Security</h2>
        <p className="text-muted-foreground mt-1">Manage your account security and sensitive actions</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm ${message.includes('Error') || message.includes('Failed') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
          {message}
        </div>
      )}

      {showDeleteDialog ? (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Confirm Account Deletion
            </CardTitle>
            <CardDescription>
              This action is irreversible. All your data will be permanently removed, including your profile, comments, quiz scores, and any saved content. Type <strong>DELETE</strong> to confirm.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="border-red-300 focus-visible:ring-red-500"
            />
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleDeleteSubmit}
                disabled={deleteInput !== 'DELETE'}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Permanently Delete My Account
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowDeleteDialog(false); setDeleteInput(''); setMessage(''); }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" /> Password & Authentication
              </CardTitle>
              <CardDescription>Manage your login credentials and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Password</div>
                    <div className="text-xs text-muted-foreground">Last changed recently</div>
                  </div>
                </div>
                <Button variant="outline" size="sm">Change</Button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Two-Factor Authentication</div>
                    <div className="text-xs text-muted-foreground">Add an extra layer of security</div>
                  </div>
                </div>
                <Button variant="outline" size="sm">Enable</Button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Active Sessions</div>
                    <div className="text-xs text-muted-foreground">Manage devices where you&apos;re logged in</div>
                  </div>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" /> Danger Zone
              </CardTitle>
              <CardDescription>
                Once you delete your account, there is no going back. Please be certain.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                <div>
                  <div className="text-sm font-medium text-red-700">Delete Account</div>
                  <div className="text-xs text-red-500">
                    Permanently remove your account and all associated data
                  </div>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
