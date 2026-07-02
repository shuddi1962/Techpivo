import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const postId = searchParams.get('post_id');
  if (!postId) return NextResponse.json({ error: 'post_id required' }, { status: 400 });

  const supabase = await createClient();

  const { data: discussions } = await supabase
    .from('article_discussions')
    .select('*, author:user_profiles(username, full_name, avatar_url, level)')
    .eq('post_id', postId)
    .eq('is_hidden', false)
    .is('parent_id', null)
    .order('created_at', { ascending: false });

  return NextResponse.json({ discussions: discussions || [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { post_id, content, parent_id } = body;
  if (!post_id || !content) return NextResponse.json({ error: 'post_id and content required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('article_discussions')
    .insert({
      post_id,
      author_id: user?.id || null,
      parent_id: parent_id || null,
      content,
    })
    .select('*, author:user_profiles(username, full_name, avatar_url, level)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (parent_id) {
    await supabase.rpc('increment_column', { table_name: 'article_discussions', column_name: 'reply_count', row_id: parent_id });
  }

  return NextResponse.json({ discussion: data });
}
