import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('forum_replies')
    .insert({
      post_id: id,
      author_id: user.id,
      content: body.content,
    })
    .select('*, author:user_profiles!forum_replies_author_id_fkey(username, full_name, avatar_url, level)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Update reply count on the post
  await supabase.rpc('increment_reply_count', { post_id: id }).catch(() => {
    // Fallback: manually increment
    supabase.from('forum_posts').select('reply_count').eq('id', id).single().then(({ data: post }) => {
      if (post) {
        supabase.from('forum_posts').update({ reply_count: (post.reply_count || 0) + 1 }).eq('id', id);
      }
    });
  });

  return NextResponse.json({ reply: data });
}
