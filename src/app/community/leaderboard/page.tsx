import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getLeaderboard, getRankTitle, getStarRating } from '@/lib/community';
import { Trophy, Medal, Star, Crown, TrendingUp, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Leaderboard — TechPivo Community',
  description: 'See the top contributors in the TechPivo community.',
};

export default async function LeaderboardPage() {
  const entries = await getLeaderboard(50);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/community" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Community
        </Link>

        <div className="text-center mb-8">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="text-muted-foreground mt-1">Top contributors ranked by experience points</p>
        </div>

        {entries.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-lg mx-auto">
            {[
              { entry: entries[1], medal: '🥈', color: 'from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700' },
              { entry: entries[0], medal: '🏆', color: 'from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30' },
              { entry: entries[2], medal: '🥉', color: 'from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30' },
            ].map(({ entry, medal, color }, i) => (
              <Link key={entry.user_id} href={`/u/${entry.username}`}>
                <Card className={`bg-gradient-to-b ${color} text-center hover:shadow-lg transition-shadow cursor-pointer ${i === 1 ? 'scale-105' : ''}`}>
                  <CardContent className="p-4 pt-6">
                    <div className="text-3xl mb-2">{medal}</div>
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary mx-auto mb-2">
                      {entry.full_name?.[0] || entry.username?.[0] || '?'}
                    </div>
                    <div className="font-semibold text-sm truncate">{entry.full_name || entry.username}</div>
                    <div className="text-xs text-muted-foreground mt-1">Level {entry.level}</div>
                    <div className="text-sm font-bold text-primary mt-1">{entry.score.toLocaleString()} XP</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {entries.map((entry, i) => (
                <Link
                  key={entry.user_id}
                  href={`/u/${entry.username}`}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' :
                    i === 1 ? 'bg-gray-100 text-gray-700' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {i < 3 ? ['🏆','🥈','🥉'][i] : `#${i + 1}`}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {entry.full_name?.[0] || entry.username?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{entry.full_name || entry.username}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>Level {entry.level}</span>
                      <span>·</span>
                      <span>{entry.rank}</span>
                      <span>·</span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: getStarRating(entry.level) }).map((_, j) => (
                          <Star key={j} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-primary">{entry.score.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">XP</div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
