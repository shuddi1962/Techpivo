import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import FollowButton from '@/components/follow-button';
import { getLevelForXP, getRankTitle, BADGES } from '@/lib/community-utils';
import { createClient } from '@/lib/supabase/server';
import { MapPin, Globe, Calendar, Star, Users, MessageSquare, Trophy, Target, ArrowLeft, CheckCircle } from 'lucide-react';
import { ExpertBadge } from '@/components/community/expert-badge';
import { expertTierFromAccepted } from '@/lib/community-types';
import { SOCIAL_PROVIDERS } from '@/lib/social-providers';
import BrandIcon from '@/lib/social-icons';
import type { Metadata } from 'next/types';
import { SITE_URL } from '@/lib/constants';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const description = `View ${username}'s profile on TechPivo — level, badges, activity, and contributions.`
  return {
    title: `${username} — TechPivo Community`,
    description,
    alternates: { canonical: `${SITE_URL}/u/${username}` },
    openGraph: {
      title: `${username} — TechPivo Community`,
      description,
    },
    twitter: {
      card: "summary",
      title: `${username} — TechPivo Community`,
      description,
    },
  }
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

  const { count: acceptedCount } = await supabase
    .from('forum_replies')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', profile?.id)
    .eq('is_accepted', true);

  const { data: recentPosts } = await supabase
    .from('forum_posts')
    .select('id, title, slug, created_at, category:forum_categories(name, icon, slug)')
    .eq('author_id', profile?.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full rounded-2xl border-border/60">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-2/50 flex items-center justify-center mx-auto mb-4">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold mb-2">User not found</p>
            <p className="text-muted-foreground mb-6 text-sm">No profile found for &quot;{username}&quot;</p>
            <Link href="/community">
              <Button variant="outline" className="rounded-xl border-border/60">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Community
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const socialLinks = (profile.social_links || {}) as Record<string, string>;
  const connectedSocials = SOCIAL_PROVIDERS
    .filter(p => !!socialLinks[p.id])
    .map(p => ({ id: p.id, name: p.name, url: socialLinks[p.id] as string, brand: p.brand }));

  const levelInfo = getLevelForXP(profile.xp || 0);
  interface BadgeInfo { id: string; name: string; icon: string; description: string }
  const earnedBadges: BadgeInfo[] = ((profile.badges || [])
    .map((bid: string) => BADGES.find((b: BadgeInfo) => b.id === bid))
    .filter(Boolean) as BadgeInfo[]);

  const statItems = [
    { label: 'XP', value: (profile.xp || 0).toLocaleString(), icon: Star, color: 'text-amber-500' },
    { label: 'Followers', value: followerCount || 0, icon: Users, color: 'text-blue-500' },
    { label: 'Following', value: followingCount || 0, icon: Users, color: 'text-slate-500' },
    { label: 'Forum Posts', value: postCount || 0, icon: MessageSquare, color: 'text-emerald-500' },
    { label: 'Comments', value: discussionCount || 0, icon: MessageSquare, color: 'text-violet-500' },
    { label: 'Accepted', value: acceptedCount || 0, icon: CheckCircle, color: 'text-green-500' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-slate-950 via-[#0b1035] to-[#1b1b4b] overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>
        {profile.cover_url && (
          <Image src={profile.cover_url} alt="" width={1920} height={600} className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />

        <div className="relative max-w-4xl mx-auto px-4 pt-8 pb-20">
          <Link href="/community" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Community
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-14 relative z-10">
        {/* Profile header */}
        <div className="flex flex-col md:flex-row items-start gap-5 mb-8">
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-background overflow-hidden bg-surface-2/50 shadow-xl shrink-0">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.full_name || username} width={112} height={112} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-foreground/70">
                {profile.full_name?.[0] || username[0]}
              </div>
            )}
          </div>

          <div className="flex-1 pt-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-1">
              <h1 className="text-2xl font-bold">{profile.full_name || username}</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-2/50 px-2.5 py-0.5 text-xs font-semibold">
                Lv {levelInfo.level}
              </span>
              <ExpertBadge tier={expertTierFromAccepted(acceptedCount ?? 0)} acceptedCount={acceptedCount ?? 0} />
            </div>
            <p className="text-sm text-muted-foreground mb-2">{levelInfo.title}</p>
            {profile.bio && <p className="text-sm text-muted-foreground mb-3 max-w-lg leading-relaxed">{profile.bio}</p>}

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4">
              {profile.location && (
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.location}</span>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Globe className="h-3 w-3" /> {profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              {connectedSocials.length > 0 && (
                <span className="flex items-center gap-1">
                  {connectedSocials.map(s => (
                    <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" title={s.name} aria-label={s.name}>
                      <span
                        className="flex items-center justify-center h-5 w-5 rounded text-white transition-transform hover:scale-110"
                        style={{ backgroundColor: s.brand || '#333' }}
                      >
                        <BrandIcon id={s.id} className="h-3 w-3" />
                      </span>
                    </a>
                  ))}
                </span>
              )}
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>

            <FollowButton targetUserId={profile.id} targetUsername={username} />
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
          {statItems.map((stat) => (
            <Card key={stat.label} className="rounded-2xl border-border/60 bg-card">
              <CardContent className="p-3 md:p-4 text-center">
                <stat.icon className={`h-4 w-4 mx-auto mb-1 ${stat.color}`} />
                <div className="text-xl font-bold tabular-nums">{stat.value}</div>
                <div className="text-[11px] text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Level + Badges */}
        <div className="grid md:grid-cols-2 gap-5 mb-8">
          <Card className="rounded-2xl border-border/60 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Target className="h-4 w-4 text-amber-500" />
                </div>
                <h3 className="font-semibold text-sm">Level Progress</h3>
              </div>
              <div className="text-center mb-4">
                <div className="text-3xl mb-1">{levelInfo.icon}</div>
                <div className="text-sm font-semibold">Level {levelInfo.level} — {levelInfo.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {(profile.xp || 0).toLocaleString()} / {levelInfo.xpForNext.toLocaleString()} XP
                </div>
              </div>
              <div className="relative h-2.5 bg-surface-2/50 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                  style={{ width: `${levelInfo.progress}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground text-center mt-2">
                {getRankTitle(levelInfo.level)}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-violet-500" />
                </div>
                <h3 className="font-semibold text-sm">Badges ({earnedBadges.length})</h3>
              </div>
              {earnedBadges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {earnedBadges.map((b: BadgeInfo) => (
                    <div key={b.id} className="flex items-center gap-1.5 text-sm bg-surface-2/50 px-3 py-1.5 rounded-full" title={b.description}>
                      <span>{b.icon}</span>
                      <span className="text-xs font-medium">{b.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">No badges earned yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent posts */}
        {recentPosts && recentPosts.length > 0 && (
          <Card className="rounded-2xl border-border/60 bg-card mb-8">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                </div>
                <h3 className="font-semibold text-sm">Recent Forum Posts</h3>
              </div>
              <div className="divide-y divide-border/40">
                {recentPosts.map((post: any) => (
                  <Link
                    key={post.id}
                    href={`/community/forum/${post.category?.slug || 'general'}/${post.slug || post.id}`}
                    className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-surface-2/30 transition-colors group"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium group-hover:text-foreground transition-colors truncate">{post.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {post.category?.icon} {post.category?.name} · {new Date(post.created_at).toLocaleDateString()}
                      </div>
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
