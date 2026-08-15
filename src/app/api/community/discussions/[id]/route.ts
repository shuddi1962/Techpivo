import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enrichAuthors } from '@/lib/community-server';

const POST_SELECT = '*, category:forum_categories(name, slug, icon)';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from('forum_posts')
    .select(POST_SELECT)
    .eq('id', id)
    .single();

  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const [postFull] = await enrichAuthors([post], supabase);

  // Increment view count via SECURITY DEFINER RPC (RLS-safe).
  // Only when count_view=1 — the client dedupes to once per post per 24h.
  if (request.nextUrl.searchParams.get('count_view') === '1') {
    await supabase.rpc('increment_views', { target_id: id, target_type: 'forum' });
  }

  const { data: replies } = await supabase
    .from('forum_replies')
    .select('*')
    .eq('post_id', id)
    .order('is_accepted', { ascending: false })
    .order('vote_count', { ascending: false })
    .order('created_at', { ascending: true });

  const repliesFull = await enrichAuthors(replies || [], supabase);

  // Current user's vote state (RLS owner policy: only own rows)
  const { data: { user } } = await supabase.auth.getUser();
  let my_votes: { target_id: string; vote: string }[] = [];
  if (user) {
    const ids = [postFull.id, ...repliesFull.map(r => r.id)];
    const { data: votes } = await supabase
      .from('forum_votes')
      .select('post_id, reply_id, vote_type')
      .eq('user_id', user.id)
      .or(`post_id.in.(${ids.join(',')}),reply_id.in.(${ids.join(',')})`);
    my_votes = (votes || []).map(v => ({
      target_id: v.post_id ?? v.reply_id,
      vote: v.vote_type === 1 ? 'up' : 'down',
    }));
  }

  return NextResponse.json({ post: postFull, replies: repliesFull, my_votes });
}