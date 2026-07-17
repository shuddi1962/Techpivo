import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('polls')
    .select('*, options:poll_options(*)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  return NextResponse.json({ polls: data || [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { poll_id, option_id } = body;
  const { error } = await supabase
    .from('poll_votes')
    .insert({ poll_id, option_id, user_id: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.rpc('increment_poll_votes', { poll_id, option_id });
  return NextResponse.json({ success: true });
}
