'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Clock, CheckCircle2, XCircle, Trophy, RotateCcw, PartyPopper, ThumbsUp, Sparkles, BookOpen, Zap } from 'lucide-react';
import { CommunityHero } from '@/components/community/community-hero';

interface Question {
  id: string;
  question: string;
  question_type: string;
  options: string[];
  points: number;
}

interface QuestionResult {
  question_id: string;
  correct: boolean;
  explanation: string | null;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: string;
  time_limit: number | null;
  question_count: number;
  image_url: string | null;
}

interface QuizState {
  status: 'loading' | 'ready' | 'answering' | 'finished';
  questions: Question[];
  currentIndex: number;
  answers: Record<string, string>;
  score: number;
  correctAnswers: number;
  timeElapsed: number;
  attemptSaved: boolean;
  saveError: boolean;
  xpAwarded: boolean;
  results: QuestionResult[];
}

export default function QuizRunnerPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [state, setState] = useState<QuizState>({
    status: 'loading',
    questions: [],
    currentIndex: 0,
    answers: {},
    score: 0,
    correctAnswers: 0,
    timeElapsed: 0,
    attemptSaved: false,
    saveError: false,
    xpAwarded: false,
    results: [],
  });

  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/community/quiz/${id}`).then(r => r.json()).then(data => {
        setQuiz(data.quiz);
        setState(prev => ({ ...prev, questions: data.questions, status: 'ready' }));
      }).catch(() => {
        setState(prev => ({ ...prev, status: 'ready' }));
      });
    });
  }, [params]);

  useEffect(() => {
    if (state.status !== 'answering') return;
    const timer = setInterval(() => {
      setState(prev => ({ ...prev, timeElapsed: prev.timeElapsed + 1 }));
    }, 1000);
    return () => clearInterval(timer);
  }, [state.status]);

  const startQuiz = () => {
    setState(prev => ({ ...prev, status: 'answering', currentIndex: 0, answers: {}, score: 0, correctAnswers: 0, timeElapsed: 0, attemptSaved: false, saveError: false, xpAwarded: false, results: [] }));
  };

  const selectAnswer = (questionId: string, answer: string) => {
    setState(prev => ({ ...prev, answers: { ...prev.answers, [questionId]: answer } }));
  };

  const nextQuestion = () => {
    if (state.currentIndex < state.questions.length - 1) {
      setState(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
    } else {
      // Server-side grading — correct answers never reach the browser.
      setState(prev => ({ ...prev, status: 'finished' }));
      params.then(({ id }) => {
        fetch(`/api/community/quiz/${id}/attempt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            time_taken: state.timeElapsed,
            answers: state.answers,
          }),
        })
          .then(r => r.json().then(data => ({ ok: r.ok, data })))
          .then(({ ok, data }) => {
            if (ok) {
              setState(prev => ({
                ...prev,
                attemptSaved: true,
                score: data.score ?? prev.score,
                correctAnswers: data.correct_answers ?? prev.correctAnswers,
                xpAwarded: !!data.xp_awarded,
                results: data.results ?? [],
              }));
            } else {
              setState(prev => ({ ...prev, saveError: true }));
            }
          })
          .catch(() => setState(prev => ({ ...prev, saveError: true })));
      });
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const currentQ = state.questions[state.currentIndex];
  const progress = state.questions.length > 0 ? ((state.currentIndex + 1) / state.questions.length) * 100 : 0;

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">Quiz not found.</p>
            <Link href="/community/quiz"><Button>Back to Quizzes</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.status === 'ready') {
    return (
      <div className="min-h-screen bg-background">
        <CommunityHero
          badge={`Quiz · ${quiz.difficulty}`}
          title={quiz.title}
          subtitle={quiz.description || undefined}
          icon={<Zap className="h-3.5 w-3.5" />}
          backHref="/community/quiz"
          backLabel="Back to Quizzes"
          imageUrl={quiz.image_url}
        >
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/85">
              {quiz.question_count} Questions
            </span>
            {quiz.time_limit && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/85">
                <Clock className="h-3 w-3" /> {quiz.time_limit}s per question
              </span>
            )}
            <button
              type="button"
              onClick={startQuiz}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 transition-all duration-200 hover:bg-white/90"
            >
              <Zap className="h-4 w-4" /> Start Quiz
            </button>
          </div>
        </CommunityHero>
        <div className="mx-auto max-w-2xl px-4 py-10">
          <Card>
            <CardContent className="p-8 text-center">
              {quiz.image_url && (
                <img src={quiz.image_url} alt={quiz.title} className="w-full h-44 object-cover rounded-xl mb-6" />
              )}
              <h2 className="text-xl font-bold mb-2">{quiz.title}</h2>
              <p className="text-muted-foreground text-sm mb-4">Complete the quiz to earn XP and climb the leaderboard.</p>
              <div className="flex flex-wrap gap-3 justify-center mb-8">
                <Badge variant={quiz.difficulty === 'easy' ? 'default' : quiz.difficulty === 'hard' ? 'destructive' : 'secondary'}>
                  {quiz.difficulty}
                </Badge>
                <Badge variant="outline">{quiz.question_count} Questions</Badge>
                {quiz.time_limit && <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> {quiz.time_limit}s per question</Badge>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (state.status === 'answering' && currentQ) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              Question {state.currentIndex + 1} of {state.questions.length}
            </span>
            <span className="flex items-center gap-1 text-sm font-mono">
              <Clock className="h-4 w-4" /> {formatTime(state.timeElapsed)}
            </span>
          </div>
          <Progress value={progress} className="mb-6" />
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-6">{currentQ.question}</h2>
              <div className="space-y-3">
                {currentQ.options.map((opt, i) => {
                  const isSelected = state.answers[currentQ.id] === opt;
                  return (
                    <button
                      key={i}
                      onClick={() => selectAnswer(currentQ.id, opt)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 font-medium'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex justify-end">
                <Button onClick={nextQuestion} disabled={!state.answers[currentQ.id]}>
                  {state.currentIndex < state.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (state.status === 'finished') {
    const pct = state.questions.length > 0 ? (state.correctAnswers / state.questions.length) * 100 : 0;
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Card>
            <CardContent className="p-8 text-center">
              <Trophy className={`h-16 w-16 mx-auto mb-4 ${pct >= 80 ? 'text-yellow-500' : pct >= 50 ? 'text-blue-500' : 'text-muted-foreground'}`} />
              <h1 className="text-3xl font-bold mb-2">Quiz Complete!</h1>
              <p className="text-muted-foreground mb-6">{quiz.title}</p>
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-3xl font-bold text-primary">{state.score}</div>
                  <div className="text-sm text-muted-foreground">Points</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-3xl font-bold">{state.correctAnswers}/{state.questions.length}</div>
                  <div className="text-sm text-muted-foreground">Correct</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-3xl font-bold">{formatTime(state.timeElapsed)}</div>
                  <div className="text-sm text-muted-foreground">Time</div>
                </div>
              </div>
              <div className="text-lg mb-6 flex items-center justify-center gap-2">
                {pct >= 90 ? <><PartyPopper className="h-5 w-5 text-yellow-500" /> Outstanding!</> : pct >= 70 ? <><ThumbsUp className="h-5 w-5 text-emerald-500" /> Great job!</> : pct >= 50 ? <><Sparkles className="h-5 w-5 text-blue-500" /> Good effort!</> : <><BookOpen className="h-5 w-5 text-violet-500" /> Keep learning!</>}
              </div>
              {state.attemptSaved && state.xpAwarded ? (
                <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" /> Result saved to your profile · <Zap className="h-3.5 w-3.5" /> +20 XP
                </div>
              ) : state.attemptSaved ? (
                <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" /> Result saved to your profile
                </div>
              ) : state.saveError ? (
                <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm font-medium">
                  <XCircle className="h-4 w-4" /> Sign in to save your result &amp; earn XP
                </div>
              ) : null}
              <div className="flex gap-3 justify-center">
                <Button onClick={startQuiz}><RotateCcw className="mr-2 h-4 w-4" /> Try Again</Button>
                <Link href="/community/quiz"><Button variant="outline">All Quizzes</Button></Link>
              </div>
              {state.results.length > 0 && (
                <div className="mt-10 text-left border-t pt-6">
                  <h2 className="text-lg font-semibold mb-4">Question Review</h2>
                  <div className="space-y-4">
                    {state.results.map((r, i) => {
                      const q = state.questions[i];
                      return (
                        <div key={r.question_id} className={`p-4 rounded-lg border ${r.correct ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-500/5' : 'border-red-300 dark:border-red-800 bg-red-500/5'}`}>
                          <div className="flex items-start gap-2">
                            {r.correct ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" /> : <XCircle className="h-4 w-4 mt-0.5 text-red-500 shrink-0" />}
                            <div>
                              <p className="font-medium">{i + 1}. {q?.question}</p>
                              {!r.correct && q && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Your answer: <span className="text-foreground">{state.answers[q.id] ?? '—'}</span>
                                </p>
                              )}
                              {r.explanation && (
                                <p className="text-sm text-muted-foreground mt-2">{r.explanation}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
