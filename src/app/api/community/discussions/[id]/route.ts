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

  // Increment view count via SECURITY DEFINER RPC (RLS-safe)
  await supabase.rpc('increment_views', { target_id: id, target_type: 'forum' });

  const { data: replies } = await supabase
    .from('forum_replies')
    .select('*')
    .eq('post_id', id)
    .order('is_accepted', { ascending: false })
    .order('vote_count', { ascending: false })
    .order('created_at', { ascending: true });

  const repliesFull = await enrichAuthors(replies || [], supabase);

  return NextResponse.json({ post: postFull, replies: repliesFull });
}