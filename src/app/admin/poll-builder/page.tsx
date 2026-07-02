'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Plus, Trash2, Save } from 'lucide-react';

export default function AdminPollBuilderPage() {
  const [polls, setPolls] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/community/polls').then(r => r.json()).then(d => setPolls(d.polls || []));
  }, []);

  const addOption = () => setOptions([...options, '']);
  const removeOption = (idx: number) => setOptions(options.filter((_, i) => i !== idx));

  const savePoll = async () => {
    if (!title || options.filter(Boolean).length < 2) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/community/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, options: options.filter(Boolean) }),
      });
      if (res.ok) {
        setCreating(false);
        setTitle(''); setDescription(''); setOptions(['', '']);
        fetch('/api/community/polls').then(r => r.json()).then(d => setPolls(d.polls || []));
      }
    } catch (e) {
      console.error('Failed to save poll');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Poll Builder</h1>
          <p className="text-muted-foreground">Create and manage community polls</p>
        </div>
        <Button onClick={() => setCreating(!creating)}>
          <Plus className="h-4 w-4 mr-2" /> {creating ? 'Cancel' : 'New Poll'}
        </Button>
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
                <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Poll'}
              </Button>
            </div>
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
                <div key={poll.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <div className="font-medium">{poll.title}</div>
                    <div className="text-sm text-muted-foreground">{poll.total_votes} votes · {poll.options?.length || 0} options</div>
                  </div>
                  <Badge variant={poll.is_active ? 'default' : 'outline'}>{poll.is_active ? 'Active' : 'Closed'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
