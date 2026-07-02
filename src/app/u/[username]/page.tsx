import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getLevelForXP, getRankTitle, BADGES } from '@/lib/community-utils';
import { createClient } from '@/lib/supabase/server';
import { MapPin, Globe, Calendar, Star, Users, BookOpen, MessageSquare, Trophy, Target, ArrowLeft } from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return { title: `${username} — TechPivo Community` };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('username', username)
    .single();

  const { count: followerCount } = await supabase
    .from('user_follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', profile?.id);

  const { count: followingCount } = await supabase
    .from('user_follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', profile?.id);

  const { count: postCount } = await supabase
    .from('forum_posts')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', profile?.id);

  const { count: discussionCount } = await supabase
    .from('article_discussions')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', profile?.id);

  const { data: recentPosts } = await supabase
    .from('forum_posts')
    .select('id, title, created_at, category:forum_categories(name, icon)')
    .eq('author_id', profile?.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-lg font-semibold mb-2">User not found</p>
            <p className="text-muted-foreground mb-4">No profile found for &quot;{username}&quot;</p>
            <Link href="/community"><Button>Back to Community</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const levelInfo = getLevelForXP(profile.xp || 0);
  interface BadgeInfo { id: string; name: string; icon: string; description: string }
  const earnedBadges: BadgeInfo[] = ((profile.badges || [])
    .map((bid: string) => BADGES.find((b: BadgeInfo) => b.id === bid))
    .filter(Boolean) as BadgeInfo[]);

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-48 bg-gradient-to-r from-primary/20 to-primary/5">
        {profile.cover_url && (
          <img src={profile.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
          <div className="w-28 h-28 rounded-full bg-primary/10 border-4 border-background flex items-center justify-center text-3xl font-bold text-primary">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              profile.full_name?.[0] || username[0]
            )}
          </div>
          <div className="flex-1 pt-2">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{profile.full_name || username}</h1>
              <Badge variant="secondary">Level {levelInfo.level}</Badge>
            </div>
            <p className="text-lg text-muted-foreground mb-2">{levelInfo.title}</p>
            {profile.bio && <p className="text-muted-foreground mb-3 max-w-lg">{profile.bio}</p>}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {profile.location && (
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.location}</span>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                  <Globe className="h-3 w-3" /> {profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'XP', value: (profile.xp || 0).toLocaleString(), icon: Star },
            { label: 'Followers', value: followerCount || 0, icon: Users },
            { label: 'Following', value: followingCount || 0, icon: Users },
            { label: 'Forum Posts', value: postCount || 0, icon: MessageSquare },
            { label: 'Comments', value: discussionCount || 0, icon: MessageSquare },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 text-center">
                <stat.icon className="h-5 w-5 mx-auto mb-1 text-primary" />
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Level Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">{levelInfo.icon}</div>
                <div className="text-lg font-semibold">Level {levelInfo.level} — {levelInfo.title}</div>
                <div className="text-sm text-muted-foreground">
                  {(profile.xp || 0).toLocaleString()} / {levelInfo.xpForNext.toLocaleString()} XP
                </div>
              </div>
              <Progress value={levelInfo.progress} className="h-3" />
            </CardContent>
          </Card>

          {earnedBadges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Badges ({earnedBadges.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {earnedBadges.map((b: BadgeInfo) => (
                    <div key={b.id} className="flex items-center gap-1.5 text-sm bg-muted px-3 py-1.5 rounded-full" title={b.description}>
                      <span>{b.icon}</span>
                      <span>{b.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {recentPosts && recentPosts.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Recent Forum Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentPosts.map((post: any) => (
                  <Link
                    key={post.id}
                    href={`/community/forum/general/${post.id}`}
                    className="block p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="font-medium">{post.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {post.category?.icon} {post.category?.name} · {new Date(post.created_at).toLocaleDateString()}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
