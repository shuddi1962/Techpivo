'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { Brain, Plus, Trash2, Save, Eye, Loader2 } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  question_type: 'multiple_choice' | 'true_false';
  options: string[];
  correct_answer: string;
  explanation: string;
  points: number;
}

export default function AdminQuizBuilderPage() {
  const supabase = createClient();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [imageUrl, setImageUrl] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadQuizzes = useCallback(async () => {
    const { data } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false });
    setQuizzes(data || []);
  }, [supabase]);

  useEffect(() => {
    loadQuizzes();
    const channel = supabase
      .channel(`admin_quizzes_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "quizzes" }, () => loadQuizzes())
      .subscribe();
    channelRef.current = channel;
    const poll = setInterval(loadQuizzes, 30000);
    const onFocus = () => loadQuizzes();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channelRef.current!);
    };
  }, [supabase, loadQuizzes]);

  const postAction = async (body: Record<string, unknown>): Promise<{ ok: boolean; data?: any; error?: string }> => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      const res = await fetch('/api/admin/community/quiz', {
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

  const addQuestion = () => {
    setQuestions([...questions, {
      id: Date.now().toString(),
      question: '',
      question_type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
      points: 1,
    }]);
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    setQuestions(questions.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions(questions.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options];
      opts[oIdx] = value;
      return { ...q, options: opts };
    }));
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const saveQuiz = async () => {
    if (!title || questions.length === 0) return;
    setSaving(true);
    setError('');
    const r = await postAction({
      title, description, category, difficulty, image_url: imageUrl,
      questions: questions.map((q, i) => ({
        ...q,
        sort_order: i,
        options: q.question_type === 'true_false' ? ['True', 'False'] : q.options.filter(Boolean),
      })),
    });
    if (!r.ok) {
      setError(r.error || 'Failed to save quiz');
    } else {
      setCreating(false);
      setTitle(''); setDescription(''); setCategory(''); setImageUrl(''); setQuestions([]);
    }
    setSaving(false);
  };

  const toggleQuiz = async (quiz: any) => {
    setBusyId(quiz.id);
    const r = await postAction({ action: 'toggle', id: quiz.id });
    if (!r.ok) setError(r.error || 'Failed to toggle quiz');
    setBusyId(null);
  };

  const deleteQuiz = async (quiz: any) => {
    if (!confirm(`Delete quiz "${quiz.title}"? This cannot be undone.`)) return;
    setBusyId(quiz.id);
    const r = await postAction({ action: 'delete', id: quiz.id });
    if (!r.ok) setError(r.error || 'Failed to delete quiz');
    setBusyId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Quiz Builder</h1>
          <p className="text-muted-foreground">Create and manage quizzes for the community</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
          </span>
          <Button onClick={() => setCreating(!creating)}>
            <Plus className="h-4 w-4 mr-2" /> {creating ? 'Cancel' : 'New Quiz'}
          </Button>
        </div>
      </div>

      {creating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Quiz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Title</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Quiz title" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Category</label>
                <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Programming" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Brief description" />
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
            <div className="flex gap-2">
              {['easy', 'medium', 'hard'].map(d => (
                <button key={d} onClick={() => setDifficulty(d)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${difficulty === d ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {d}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Questions ({questions.length})</h3>
                <Button variant="outline" size="sm" onClick={addQuestion}><Plus className="h-3 w-3 mr-1" /> Add</Button>
              </div>
              {questions.map((q, idx) => (
                <Card key={q.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge>Q{idx + 1}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => removeQuestion(idx)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    </div>
                    <Input value={q.question} onChange={e => updateQuestion(idx, 'question', e.target.value)} placeholder="Question text" />
                    <div className="flex gap-2">
                      {['multiple_choice', 'true_false'].map(t => (
                        <button key={t} onClick={() => updateQuestion(idx, 'question_type', t)} className={`px-2 py-1 rounded text-xs ${q.question_type === t ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          {t === 'multiple_choice' ? 'Multiple Choice' : 'True/False'}
                        </button>
                      ))}
                    </div>
                    {q.question_type === 'multiple_choice' ? (
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <input type="radio" name={`q-${idx}`} checked={q.correct_answer === opt} onChange={() => updateQuestion(idx, 'correct_answer', opt)} />
                            <Input value={opt} onChange={e => updateOption(idx, oIdx, e.target.value)} placeholder={`Option ${oIdx + 1}`} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {['True', 'False'].map(opt => (
                          <button key={opt} onClick={() => { updateQuestion(idx, 'correct_answer', opt); updateOption(idx, 0, 'True'); updateOption(idx, 1, 'False'); }} className={`px-3 py-1.5 rounded text-sm ${q.correct_answer === opt ? 'bg-green-500 text-white' : 'bg-muted'}`}>{opt}</button>
                        ))}
                      </div>
                    )}
                    <Input value={q.explanation} onChange={e => updateQuestion(idx, 'explanation', e.target.value)} placeholder="Explanation (optional)" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={saveQuiz} disabled={saving || !title || questions.length === 0}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} {saving ? 'Saving...' : 'Save Quiz'}
              </Button>
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Existing Quizzes</CardTitle></CardHeader>
        <CardContent>
          {quizzes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No quizzes yet. Create one above.</p>
          ) : (
            <div className="space-y-2">
              {quizzes.map((quiz: any) => (
                <div key={quiz.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0">
                    {quiz.image_url && (
                      <img src={quiz.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{quiz.title}</div>
                      <div className="text-sm text-muted-foreground">{quiz.question_count} questions · {quiz.difficulty}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={quiz.is_published ? 'default' : 'outline'}>{quiz.is_published ? 'Published' : 'Draft'}</Badge>
                    <Button variant="outline" size="sm" onClick={() => toggleQuiz(quiz)} disabled={busyId === quiz.id}>
                      {busyId === quiz.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteQuiz(quiz)} disabled={busyId === quiz.id}>
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
