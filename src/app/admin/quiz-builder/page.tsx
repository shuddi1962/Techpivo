'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Brain, Plus, Trash2, Save, Eye } from 'lucide-react';

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
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/community/quiz').then(r => r.json()).then(d => setQuizzes(d.quizzes || []));
  }, []);

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
    try {
      const res = await fetch('/api/admin/community/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description, category, difficulty,
          questions: questions.map((q, i) => ({
            ...q,
            sort_order: i,
            options: q.question_type === 'true_false' ? ['True', 'False'] : q.options.filter(Boolean),
          })),
        }),
      });
      if (res.ok) {
        setCreating(false);
        setTitle(''); setDescription(''); setCategory(''); setQuestions([]);
        fetch('/api/community/quiz').then(r => r.json()).then(d => setQuizzes(d.quizzes || []));
      }
    } catch (e) {
      console.error('Failed to save quiz');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quiz Builder</h1>
          <p className="text-muted-foreground">Create and manage quizzes for the community</p>
        </div>
        <Button onClick={() => setCreating(!creating)}>
          <Plus className="h-4 w-4 mr-2" /> {creating ? 'Cancel' : 'New Quiz'}
        </Button>
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
                <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Quiz'}
              </Button>
            </div>
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
                <div key={quiz.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <div className="font-medium">{quiz.title}</div>
                    <div className="text-sm text-muted-foreground">{quiz.question_count} questions · {quiz.difficulty}</div>
                  </div>
                  <Badge variant={quiz.is_published ? 'default' : 'outline'}>{quiz.is_published ? 'Published' : 'Draft'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
