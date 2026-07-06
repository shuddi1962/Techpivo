import Link from 'next/link';
import { Brain, Clock, Users, BarChart, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { getQuizzes } from '@/lib/community';

export const metadata = {
  title: 'Quizzes — TechPivo Community',
  description: 'Test your technology knowledge with interactive quizzes.',
};

const difficultyConfig: Record<string, { label: string; gradient: string; badge: string }> = {
  easy: { label: 'Easy', gradient: 'from-emerald-500 to-teal-500', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  medium: { label: 'Medium', gradient: 'from-amber-500 to-orange-500', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  hard: { label: 'Hard', gradient: 'from-red-500 to-rose-500', badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' },
};

export default async function QuizPage() {
  const quizzes = await getQuizzes(30);
  const categories = [...new Set(quizzes.map(q => q.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600/10 via-violet-500/5 to-pink-600/10 dark:from-purple-500/5 dark:via-violet-500/5 dark:to-pink-500/5 border-b border-border/40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-purple-400/10 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-20 relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 text-xs font-medium mb-4">
              <Sparkles className="h-3.5 w-3.5" /> Quiz Center
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-syne)] tracking-tight">
              Test Your Knowledge
            </h1>
            <p className="text-lg text-muted-foreground mt-3 max-w-xl">
              Challenge yourself with quizzes on programming, AI, cybersecurity, and more.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Category pills */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-foreground text-background">
              All ({quizzes.length})
            </span>
            {categories.map(cat => (
              <span key={cat} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-muted/60 text-muted-foreground border border-border/50">
                {cat}
              </span>
            ))}
          </div>
        )}

        {quizzes.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted/50 mb-6">
              <Brain className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Quizzes Yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">Quizzes are being prepared. Check back soon!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {quizzes.map((quiz) => {
              const cfg = difficultyConfig[quiz.difficulty] || difficultyConfig.medium;
              return (
                <Link key={quiz.id} href={`/community/quiz/${quiz.id}`} className="group block">
                  <div className="relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm hover:shadow-xl hover:shadow-purple-500/5 hover:border-purple-300/30 dark:hover:border-purple-700/30 transition-all duration-300 overflow-hidden h-full">
                    <div className={`h-1.5 w-full bg-gradient-to-r ${cfg.gradient}`} />
                    <div className="p-5 md:p-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.badge}`}>
                          {quiz.difficulty}
                        </span>
                        {quiz.category && (
                          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                            {quiz.category}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-base mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {quiz.title}
                      </h3>
                      {quiz.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                          {quiz.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 pt-3 border-t border-border/40">
                        <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {quiz.time_limit ? `${quiz.time_limit}s` : 'Untimed'}</span>
                        <span className="flex items-center gap-1.5"><BarChart className="h-3.5 w-3.5" /> {quiz.question_count} Q</span>
                        <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {quiz.attempt_count}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full">
                          <Zap className="h-3 w-3" /> Avg: {quiz.avg_score ? quiz.avg_score.toFixed(0) : 0}%
                        </span>
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-purple-600 dark:text-purple-400 group-hover:gap-2 transition-all">
                          Start <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
