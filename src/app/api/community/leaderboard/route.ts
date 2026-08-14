import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get('period') || 'all';
  const supabase = await createClient();

  if (period === 'daily' || period === 'weekly') {
    const start = new Date(period === 'daily' ? Date.now() - 86400000 : Date.now() - 7 * 86400000).toISOString();
    const { data: logs } = await supabase
      .from('user_xp_log')
      .select('user_id, amount')
      .gte('created_at', start)
      .limit(5000);

    const totals = new Map<string, number>();
    for (const l of logs || []) {
      totals.set(l.user_id, (totals.get(l.user_id) || 0) + (l.amount || 0));
    }
    if (totals.size === 0) {
      return NextResponse.json({ entries: [], period });
    }

    const ids = [...totals.keys()];
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, username, avatar_url, level')
      .in('id', ids)
      .eq('is_public', true);

    const byId = new Map((profiles || []).map(p => [p.id, p]));
    const entries = ids
      .filter(id => byId.has(id))
      .sort((a, b) => (totals.get(b) || 0) - (totals.get(a) || 0))
      .slice(0, 50)
      .map((id, i) => {
        const p = byId.get(id)!;
        return {
          user_id: id,
          username: p.username,
          avatar_url: p.avatar_url,
          level: p.level || 1,
          score: totals.get(id) || 0,
          rank: `Level ${p.level || 1}`,
          position: i + 1,
        };
      });

    return NextResponse.json({ entries, period });
  }

  const { data: rows } = await supabase
    .from('user_profiles')
    .select('id, username, avatar_url, level, xp')
    .eq('is_public', true)
    .order('xp', { ascending: false })
    .limit(50);

  const entries = (rows || []).map((r, i) => ({
    user_id: r.id,
    username: r.username,
    avatar_url: r.avatar_url,
    level: r.level || 1,
    score: r.xp || 0,
    rank: `Level ${r.level || 1}`,
    position: i + 1,
  }));

  return NextResponse.json({ entries, period });
}