import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from('forum_posts')
    .select('*, author:user_profiles!forum_posts_author_id_fkey(username, full_name, avatar_url, level), category:forum_categories(name, slug, icon)')
    .eq('id', id)
    .single();

  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Increment view count via SECURITY DEFINER RPC (RLS-safe)
  await supabase.rpc('increment_views', { target_id: id, target_type: 'forum' });

  const { data: replies } = await supabase
    .from('forum_replies')
    .select('*, author:user_profiles!forum_replies_author_id_fkey(username, full_name, avatar_url, level)')
    .eq('post_id', id)
    .order('is_accepted', { ascending: false })
    .order('vote_count', { ascending: false })
    .order('created_at', { ascending: true });

  return NextResponse.json({ post, replies: replies || [] });
}
