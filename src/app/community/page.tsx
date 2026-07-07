import Link from 'next/link';
import { Badge as UIBadge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/components/ui/jsonld';
import { breadcrumbSchema, collectionPageSchema } from '@/lib/jsonld';
import { getLeaderboard, getQuizzes, getActivePolls, getForumCategories, LEVELS, BADGES, getLevelForXP } from '@/lib/community';
import { MessageSquare, Trophy, Brain, BarChart3, BookOpen, Users, Flame, Star, ArrowRight, Zap, Target, Award, Calendar } from 'lucide-react';
import { SITE_URL } from '@/lib/constants';

export const metadata = {
  title: 'Community — TechPivo',
  description: 'Join the TechPivo community. Discuss tech, take quizzes, earn rewards, and connect with fellow technology enthusiasts.',
};

export default async function CommunityPage() {
  const [leaderboard, quizzes, polls, categories] = await Promise.all([
    getLeaderboard(5),
    getQuizzes(6),
    getActivePolls(),
    getForumCategories(),
  ]);

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Community" },
      ])} />
      <JsonLd data={collectionPageSchema("TechPivo Community", "Join the TechPivo community. Discuss tech, take quizzes, earn rewards, and connect with fellow technology enthusiasts.", `${SITE_URL}/community`)} />
      <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-b">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold mb-4">TechPivo Community</h1>
            <p className="text-lg text-muted-foreground">
              Join thousands of technology enthusiasts. Discuss, learn, compete, and grow together.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 max-w-3xl mx-auto">
            {[
              { icon: MessageSquare, label: 'Forum', desc: 'Tech discussions and Q&A' },
              { icon: Brain, label: 'Quizzes', desc: 'Test your tech knowledge' },
              { icon: BarChart3, label: 'Polls', desc: 'Share your opinion' },
              { icon: Trophy, label: 'Leaderboard', desc: 'Compete and earn XP' },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-4 rounded-xl bg-card border">
                <stat.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="font-bold text-lg">{stat.label}</div>
                <div className="text-sm text-muted-foreground">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Top Contributors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.slice(0, 5).map((entry, i) => (
                  <Link
                    key={entry.user_id}
                    href={`/u/${entry.username}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0 ? 'bg-yellow-100 text-yellow-700' :
                      i === 1 ? 'bg-gray-100 text-gray-700' :
                      i === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                      {entry.full_name?.[0] || entry.username?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{entry.full_name || entry.username}</div>
                      <div className="text-sm text-muted-foreground">Level {entry.level} · {entry.xp.toLocaleString()} XP</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, Math.ceil(entry.level / 10)) }).map((_, j) => (
                        <Star key={j} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
              <Link href="/community/leaderboard">
                <Button variant="outline" className="w-full mt-4">
                  View Full Leaderboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {LEVELS.map((l) => (
                    <div key={l.level} className="flex items-center justify-between text-sm p-1.5 rounded hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <span>{l.icon}</span>
                        <span>{l.title}</span>
                      </div>
                      <span className="text-muted-foreground">Lv.{l.level}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-500" />
                  Badges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {BADGES.slice(0, 10).map((b) => (
                    <div key={b.id} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full" title={b.description}>
                      <span>{b.icon}</span>
                      <span>{b.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              Forum Categories
            </h2>
            <Link href="/community/forum">
              <Button variant="outline" size="sm">View All <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {categories.slice(0, 8).map((cat) => (
              <Link key={cat.id} href={`/community/forum/${cat.slug}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">{cat.icon}</div>
                    <div className="font-medium">{cat.name}</div>
                    <div className="text-sm text-muted-foreground">{cat.post_count} posts</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-purple-500" />
              Quizzes
            </h2>
            <Link href="/community/quiz">
              <Button variant="outline" size="sm">All Quizzes <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.slice(0, 6).map((quiz) => (
              <Link key={quiz.id} href={`/community/quiz/${quiz.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <UIBadge variant={quiz.difficulty === 'easy' ? 'default' : quiz.difficulty === 'hard' ? 'destructive' : 'secondary'}>
                        {quiz.difficulty}
                      </UIBadge>
                      <span className="text-sm text-muted-foreground">{quiz.question_count} Q</span>
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{quiz.title}</h3>
                    {quiz.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{quiz.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span>{quiz.attempt_count} attempts</span>
                      <span>Avg: {quiz.avg_score.toFixed(0)}%</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {polls.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-green-500" />
                Active Polls
              </h2>
              <Link href="/community/polls">
                <Button variant="outline" size="sm">All Polls <ArrowRight className="ml-1 h-4 w-4" /></Button>
              </Link>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {polls.slice(0, 4).map((poll) => (
                <Card key={poll.id}>
                  <CardContent className="p-5">
                    <h3 className="font-semibold mb-3">{poll.title}</h3>
                    <div className="space-y-2">
                      {(poll.options || []).map((opt) => {
                        const pct = poll.total_votes > 0 ? (opt.vote_count / poll.total_votes) * 100 : 0;
                        return (
                          <div key={opt.id} className="relative">
                            <div className="h-8 rounded-md bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary/20 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="absolute inset-0 flex items-center px-3 text-sm">
                              <span className="flex-1">{opt.text}</span>
                              <span className="font-medium">{pct.toFixed(0)}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">{poll.total_votes} votes</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-500" />
              Upcoming Events
            </h2>
            <Link href="/community/events">
              <Button variant="outline" size="sm">View Events <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <Link href="/community/events">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="font-medium">Tech Events & Meetups</div>
                    <div className="text-sm text-muted-foreground">Workshops, conferences, and community gatherings</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/community/events?type=workshop">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <div className="font-medium">Workshops</div>
                    <div className="text-sm text-muted-foreground">Hands-on coding sessions and tutorials</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-8 text-center">
            <Zap className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-2">Ready to Join?</h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Create your profile, start earning XP, climb the leaderboard, and connect with thousands of tech enthusiasts.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/register">
                <Button size="lg">Create Account</Button>
              </Link>
              <Link href="/community/forum">
                <Button variant="outline" size="lg">Browse Forum</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
