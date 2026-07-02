'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Clock, CheckCircle2, XCircle, Trophy, RotateCcw } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  points: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: string;
  time_limit: number | null;
  question_count: number;
}

interface QuizState {
  status: 'loading' | 'ready' | 'answering' | 'finished';
  questions: Question[];
  currentIndex: number;
  answers: Record<string, string>;
  score: number;
  correctAnswers: number;
  timeElapsed: number;
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
    setState(prev => ({ ...prev, status: 'answering', currentIndex: 0, answers: {}, score: 0, correctAnswers: 0, timeElapsed: 0 }));
  };

  const selectAnswer = (questionId: string, answer: string) => {
    setState(prev => ({ ...prev, answers: { ...prev.answers, [questionId]: answer } }));
  };

  const nextQuestion = () => {
    if (state.currentIndex < state.questions.length - 1) {
      setState(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
    } else {
      let score = 0;
      let correct = 0;
      state.questions.forEach(q => {
        if (state.answers[q.id] === q.correct_answer) {
          score += q.points;
          correct++;
        }
      });
      setState(prev => ({ ...prev, status: 'finished', score, correctAnswers: correct }));
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
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Link href="/community/quiz" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Quizzes
          </Link>
          <Card>
            <CardContent className="p-8 text-center">
              <h1 className="text-3xl font-bold mb-4">{quiz.title}</h1>
              {quiz.description && <p className="text-muted-foreground mb-6">{quiz.description}</p>}
              <div className="flex flex-wrap gap-3 justify-center mb-8">
                <Badge variant={quiz.difficulty === 'easy' ? 'default' : quiz.difficulty === 'hard' ? 'destructive' : 'secondary'}>
                  {quiz.difficulty}
                </Badge>
                <Badge variant="outline">{quiz.question_count} Questions</Badge>
                {quiz.time_limit && <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> {quiz.time_limit}s per question</Badge>}
              </div>
              <Button size="lg" onClick={startQuiz}>Start Quiz</Button>
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
              <div className="text-lg mb-6">
                {pct >= 90 ? '🎉 Outstanding!' : pct >= 70 ? '👏 Great job!' : pct >= 50 ? '👍 Good effort!' : '📚 Keep learning!'}
              </div>
              <div className="flex gap-3 justify-center">
                <Button onClick={startQuiz}><RotateCcw className="mr-2 h-4 w-4" /> Try Again</Button>
                <Link href="/community/quiz"><Button variant="outline">All Quizzes</Button></Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
