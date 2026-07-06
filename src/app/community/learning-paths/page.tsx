import Link from 'next/link';
import { ArrowLeft, BookOpen, Clock, Users, Zap, Sparkles, ChevronRight } from 'lucide-react';
import { getLearningPaths } from '@/lib/community';

export const metadata = {
  title: 'Learning Paths — TechPivo Community',
  description: 'Structured learning journeys to master technology skills.',
};

const difficultyStyles: Record<string, { color: string; badge: string }> = {
  Beginner: { color: 'from-emerald-500 to-teal-500', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  Intermediate: { color: 'from-amber-500 to-orange-500', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  Advanced: { color: 'from-red-500 to-rose-500', badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' },
};

export default async function LearningPathsPage() {
  const paths = await getLearningPaths();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600/10 via-indigo-500/5 to-purple-600/10 dark:from-violet-500/5 dark:via-indigo-500/5 dark:to-purple-500/5 border-b border-border/40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-violet-400/10 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 relative">
          <Link href="/community" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Community
          </Link>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400 text-xs font-medium mb-4">
              <Sparkles className="h-3.5 w-3.5" /> Learning Paths
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-syne)] tracking-tight">
              Master Technology Step by Step
            </h1>
            <p className="text-lg text-muted-foreground mt-3 max-w-xl">
              Structured learning journeys designed to take you from beginner to advanced in the technologies that matter.
            </p>
          </div>
        </div>
      </div>

      {/* Paths Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {paths.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted/50 mb-6">
              <BookOpen className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Learning Paths Yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">Learning paths are being created. Check back soon!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paths.map((path) => {
              const style = difficultyStyles[path.difficulty] || difficultyStyles.Beginner;
              return (
                <div key={path.id} className="group relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm hover:shadow-xl hover:shadow-violet-500/5 hover:border-violet-300/30 dark:hover:border-violet-700/30 transition-all duration-300 overflow-hidden">
                  {/* Top accent bar */}
                  <div className={`h-1.5 w-full bg-gradient-to-r ${path.color_from} ${path.color_to}`} />
                  <div className="p-5 md:p-6 flex flex-col h-full">
                    {/* Icon + Difficulty */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${path.color_from} ${path.color_to} flex items-center justify-center text-2xl shadow-lg`}>
                          {path.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-base group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                            {path.title}
                          </h3>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mt-1 ${style.badge}`}>
                            {path.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                      {path.description}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 pt-3 border-t border-border/40">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" /> {path.lesson_count} lessons
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> {path.duration}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" /> {path.enrolled_count}
                      </span>
                    </div>

                    {/* XP + CTA */}
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full">
                        <Zap className="h-3 w-3" /> {path.xp_reward} XP
                      </span>
                      <Link
                        href="/community"
                        className="inline-flex items-center gap-1 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                      >
                        Browse <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
