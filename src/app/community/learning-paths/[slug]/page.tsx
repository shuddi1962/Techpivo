import Link from 'next/link';
import { ArrowLeft, BookOpen, Clock, Users, Zap, Sparkles, ChevronRight, CheckCircle2, GraduationCap, ListOrdered } from 'lucide-react';
import { JsonLd } from '@/components/ui/jsonld';
import { breadcrumbSchema, courseSchema } from '@/lib/jsonld';
import { getLearningPathBySlug, getLearningPathLessons, getLearningPaths } from '@/lib/community';
import { SITE_URL } from '@/lib/constants';
import type { Metadata } from 'next/types';

interface PageParams {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const paths = await getLearningPaths();
  return paths.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const path = await getLearningPathBySlug(slug);
  return {
    title: path ? `${path.title} — Learning Path | TechPivo` : 'Learning Path — TechPivo',
    description: path?.description || 'Structured learning journey at TechPivo.',
    alternates: { canonical: `${SITE_URL}/community/learning-paths/${slug}` },
  };
}

const difficultyStyles: Record<string, { color: string; badge: string }> = {
  Beginner: { color: 'from-emerald-500 to-teal-500', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  Intermediate: { color: 'from-amber-500 to-orange-500', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  Advanced: { color: 'from-red-500 to-rose-500', badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' },
};

export default async function LearningPathDetailPage({ params }: PageParams) {
  const { slug } = await params;
  const [path, otherPaths] = await Promise.all([
    getLearningPathBySlug(slug),
    getLearningPaths(),
  ]);

  if (!path) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Learning Path Not Found</h1>
          <p className="text-muted-foreground mb-6">This learning path may not be published yet.</p>
          <Link href="/community/learning-paths" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-foreground text-background">
            <ArrowLeft className="h-4 w-4" /> All Learning Paths
          </Link>
        </div>
      </div>
    );
  }

  const lessons = await getLearningPathLessons(path.id);
  const style = difficultyStyles[path.difficulty] || difficultyStyles.Beginner;
  const others = otherPaths.filter(p => p.id !== path.id).slice(0, 3);

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Community", url: `${SITE_URL}/community` },
        { name: "Learning Paths", url: `${SITE_URL}/community/learning-paths` },
        { name: path.title },
      ])} />
      <JsonLd data={courseSchema({
        name: path.title,
        description: path.description,
        url: `${SITE_URL}/community/learning-paths/${path.slug}`,
        image: path.image_url || undefined,
      })} />
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
        {/* Hero */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600/10 via-indigo-500/5 to-purple-600/10 dark:from-violet-500/5 dark:via-indigo-500/5 dark:to-purple-500/5 border-b border-border/40">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-violet-400/10 via-transparent to-transparent" />
          <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 relative">
            <Link href="/community/learning-paths" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="h-4 w-4" /> All Learning Paths
            </Link>
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {path.image_url ? (
                <img src={path.image_url} alt={path.title} className="w-full md:w-56 h-44 md:h-36 rounded-2xl object-cover shadow-xl shadow-violet-500/10" />
              ) : (
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${path.color_from} ${path.color_to} flex items-center justify-center text-4xl shadow-xl shrink-0`}>
                  {path.icon}
                </div>
              )}
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400 text-xs font-medium mb-3">
                  <Sparkles className="h-3.5 w-3.5" /> Learning Path
                </div>
                <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-syne)] tracking-tight">
                  {path.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style.badge}`}>
                    {path.difficulty}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-full">
                    <Clock className="h-3 w-3" /> {path.duration}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-full">
                    <Users className="h-3 w-3" /> {path.enrolled_count} learners
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full">
                    <Zap className="h-3 w-3" /> {path.xp_reward} XP on completion
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
          {/* Description */}
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">{path.description}</p>

          {/* Lessons */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-7 w-1 rounded-full bg-gradient-to-b from-violet-500 to-purple-500" />
            <h2 className="text-xl font-bold font-[family-name:var(--font-syne)]">Curriculum</h2>
            <span className="text-sm text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-full">{lessons.length} lessons</span>
          </div>

          {lessons.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-border/60 bg-card/50">
              <ListOrdered className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">Lessons are being added. Check back soon!</p>
            </div>
          ) : (
            <ol className="relative space-y-3">
              {lessons.map((lesson, i) => (
                <li key={lesson.id}>
                  {lesson.article_slug ? (
                    <Link href={`/${lesson.article_slug}`} className="group block rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:shadow-violet-500/5 hover:border-violet-300/30 dark:hover:border-violet-700/30 transition-all duration-300">
                      <div className="p-4 md:p-5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-200/50 dark:border-violet-800/50 flex items-center justify-center text-sm font-bold text-violet-600 dark:text-violet-400 shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-violet-500/70 shrink-0" />
                            {lesson.title}
                          </h3>
                          {lesson.description && (
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{lesson.description}</p>
                          )}
                        </div>
                        {lesson.duration_minutes && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full shrink-0">
                            <Clock className="h-3 w-3" /> {lesson.duration_minutes} min
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </Link>
                  ) : (
                    <div className="rounded-2xl border border-border/60 bg-card/50 p-4 md:p-5 flex items-center gap-4 opacity-80">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold flex items-center gap-2">
                          {lesson.title}
                        </h3>
                        {lesson.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{lesson.description}</p>
                        )}
                      </div>
                      {lesson.duration_minutes && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full shrink-0">
                          <Clock className="h-3 w-3" /> {lesson.duration_minutes} min
                        </span>
                      )}
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}

          {/* Related paths */}
          {others.length > 0 && (
            <div className="mt-14">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-7 w-1 rounded-full bg-gradient-to-b from-muted-foreground/40 to-muted-foreground/20" />
                <h2 className="text-xl font-bold font-[family-name:var(--font-syne)]">Continue Learning</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {others.map(p => (
                  <Link key={p.id} href={`/community/learning-paths/${p.slug}`} className="group rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:shadow-violet-500/5 hover:border-violet-300/30 dark:hover:border-violet-700/30 transition-all duration-300 overflow-hidden">
                    {p.image_url && (
                      <div className="h-24 overflow-hidden">
                        <img src={p.image_url} alt={p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-sm mb-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{p.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {p.lesson_count} lessons</span>
                        <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {p.xp_reward} XP</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}