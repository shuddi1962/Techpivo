import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getQuizzes } from '@/lib/community';
import { Brain, Clock, Users, BarChart, ArrowLeft, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Quizzes — TechPivo Community',
  description: 'Test your technology knowledge with interactive quizzes.',
};

export default async function QuizPage() {
  const quizzes = await getQuizzes(30);

  const categories = [...new Set(quizzes.map(q => q.category).filter(Boolean))];
  const difficulties = ['easy', 'medium', 'hard'];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/community" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Community
        </Link>

        <div className="text-center mb-8">
          <Brain className="h-12 w-12 mx-auto mb-4 text-purple-500" />
          <h1 className="text-3xl font-bold">Quiz Center</h1>
          <p className="text-muted-foreground mt-1">Test your knowledge and climb the leaderboard</p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-8">
          <Badge variant="default">All ({quizzes.length})</Badge>
          {categories.map(cat => (
            <Badge key={cat} variant="outline">{cat}</Badge>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((quiz) => (
            <Link key={quiz.id} href={`/community/quiz/${quiz.id}`}>
              <Card className="hover:shadow-lg transition-all cursor-pointer h-full group">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant={
                      quiz.difficulty === 'easy' ? 'default' :
                      quiz.difficulty === 'hard' ? 'destructive' : 'secondary'
                    }>
                      {quiz.difficulty}
                    </Badge>
                    {quiz.category && (
                      <Badge variant="outline">{quiz.category}</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">{quiz.title}</h3>
                  {quiz.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{quiz.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {quiz.time_limit ? `${quiz.time_limit}s` : 'Untimed'}</span>
                    <span className="flex items-center gap-1"><BarChart className="h-3 w-3" /> {quiz.question_count} Q</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {quiz.attempt_count}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg: {quiz.avg_score.toFixed(0)}%</span>
                    <Button size="sm" variant="ghost" className="group-hover:bg-primary group-hover:text-primary-foreground">
                      Start Quiz <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {quizzes.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Quizzes Yet</h3>
              <p className="text-muted-foreground">Quizzes are being prepared. Subscribe to our newsletter to know when they launch.</p>
              <a href="/newsletter" className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-primary hover:underline">
                Subscribe to Newsletter →
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
