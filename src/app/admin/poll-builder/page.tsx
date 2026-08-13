'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { BarChart3, Plus, Trash2, Save, Loader2, Eye, X } from 'lucide-react';

export default function AdminPollBuilderPage() {
  const supabase = createClient();
  const [polls, setPolls] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadPolls = useCallback(async () => {
    const { data } = await supabase
      .from('polls')
      .select('*, options:poll_options(*)')
      .order('created_at', { ascending: false });
    setPolls(data || []);
  }, [supabase]);

  useEffect(() => {
    loadPolls();
    const channel = supabase
      .channel(`admin_polls_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "polls" }, () => loadPolls())
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_options" }, () => loadPolls())
      .subscribe();
    channelRef.current = channel;
    const poll = setInterval(loadPolls, 30000);
    const onFocus = () => loadPolls();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channelRef.current!);
    };
  }, [supabase, loadPolls]);

  const postAction = async (body: Record<string, unknown>): Promise<{ ok: boolean; data?: any; error?: string }> => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      const res = await fetch('/api/admin/community/poll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      return { ok: res.ok, data: d, error: d?.error };
    } catch {
      return { ok: false, error: 'Network error' };
    }
  };

  const addOption = () => setOptions([...options, '']);
  const removeOption = (idx: number) => setOptions(options.filter((_, i) => i !== idx));

  const savePoll = async () => {
    if (!title || options.filter(Boolean).length < 2) return;
    setSaving(true);
    setError('');
    const r = await postAction({
      title,
      description,
      image_url: imageUrl,
      options: options.filter(Boolean),
    });
    if (!r.ok) {
      setError(r.error || 'Failed to save poll');
    } else {
      setCreating(false);
      setTitle(''); setDescription(''); setImageUrl(''); setOptions(['', '']);
    }
    setSaving(false);
  };

  const togglePoll = async (poll: any) => {
    setBusyId(poll.id);
    const r = await postAction({ action: 'toggle', id: poll.id });
    if (!r.ok) setError(r.error || 'Failed to toggle poll');
    setBusyId(null);
  };

  const deletePoll = async (poll: any) => {
    if (!confirm(`Delete poll "${poll.title}"? This cannot be undone.`)) return;
    setBusyId(poll.id);
    const r = await postAction({ action: 'delete', id: poll.id });
    if (!r.ok) setError(r.error || 'Failed to delete poll');
    setBusyId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Poll Builder</h1>
          <p className="text-muted-foreground">Create and manage community polls</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
          </span>
          <Button onClick={() => setCreating(!creating)}>
            <Plus className="h-4 w-4 mr-2" /> {creating ? 'Cancel' : 'New Poll'}
          </Button>
        </div>
      </div>

      {creating && (
        <Card>
          <CardHeader><CardTitle>Create New Poll</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Question</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="What do you want to ask?" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description (optional)</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Additional context" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Image URL (optional)</label>
              <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://images.pexels.com/…" />
              {imageUrl && (
                <div className="mt-2 rounded-xl overflow-hidden border w-40 h-24">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Options</label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input value={opt} onChange={e => { const o = [...options]; o[idx] = e.target.value; setOptions(o); }} placeholder={`Option ${idx + 1}`} />
                    {options.length > 2 && (
                      <Button variant="ghost" size="sm" onClick={() => removeOption(idx)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-2" onClick={addOption}><Plus className="h-3 w-3 mr-1" /> Add Option</Button>
            </div>
            <div className="flex justify-end">
              <Button onClick={savePoll} disabled={saving || !title || options.filter(Boolean).length < 2}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} {saving ? 'Saving...' : 'Save Poll'}
              </Button>
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Existing Polls</CardTitle></CardHeader>
        <CardContent>
          {polls.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No polls yet. Create one above.</p>
          ) : (
            <div className="space-y-2">
              {polls.map((poll: any) => (
                <div key={poll.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0">
                    {poll.image_url && (
                      <img src={poll.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{poll.title}</div>
                      <div className="text-sm text-muted-foreground">{poll.total_votes} votes · {poll.options?.length || 0} options</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={poll.is_active ? 'default' : 'outline'}>{poll.is_active ? 'Active' : 'Closed'}</Badge>
                    <Button variant="outline" size="sm" onClick={() => togglePoll(poll)} disabled={busyId === poll.id}>
                      {busyId === poll.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deletePoll(poll)} disabled={busyId === poll.id}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}