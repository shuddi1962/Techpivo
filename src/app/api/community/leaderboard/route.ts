import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('user_profiles')
    .select('id, username, full_name, avatar_url, level, xp')
    .not('username', 'is', null)
    .eq('is_public', true)
    .order('xp', { ascending: false })
    .limit(50);

  const entries = (rows || []).map((r, i) => ({
    user_id: r.id,
    username: r.username,
    full_name: r.full_name,
    avatar_url: r.avatar_url,
    level: r.level || 1,
    score: r.xp || 0,
    rank: `Level ${r.level || 1}`,
    position: i + 1,
  }));

  return NextResponse.json({ entries });
}
