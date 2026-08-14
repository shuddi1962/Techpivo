import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  const supabase = await createClient();

  let query = supabase
    .from('topics')
    .select('id, slug, name, description, icon, color')
    .eq('is_approved', true);

  if (q) {
    query = query.ilike('name', `%${q}%`);
  }

  const { data: topics } = await query
    .order('name', { ascending: true })
    .limit(q ? 20 : 100);

  const rows = topics || [];

  // Counts via aggregate subqueries (topics has no counts column)
  const topicIds = rows.map(t => t.id);
  const counts = new Map<string, { posts: number; followers: number }>();
  if (topicIds.length > 0) {
    const [{ data: postCounts }, { data: followCounts }] = await Promise.all([
      supabase.from('post_topics').select('topic_id', { count: 'exact', head: false }).in('topic_id', topicIds),
      supabase.from('topic_follows').select('topic_id', { count: 'exact', head: false }).in('topic_id', topicIds),
    ]);
    const pc = new Map<string, number>();
    for (const row of postCounts || []) pc.set(row.topic_id, (pc.get(row.topic_id) || 0) + 1);
    const fc = new Map<string, number>();
    for (const row of followCounts || []) fc.set(row.topic_id, (fc.get(row.topic_id) || 0) + 1);
    for (const t of rows) counts.set(t.id, { posts: pc.get(t.id) || 0, followers: fc.get(t.id) || 0 });
  }

  return NextResponse.json({
    topics: rows.map(t => ({ ...t, post_count: counts.get(t.id)?.posts || 0, follower_count: counts.get(t.id)?.followers || 0 })),
  });
}