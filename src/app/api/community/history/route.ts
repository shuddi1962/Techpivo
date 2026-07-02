import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ history: [] });
  const { data } = await supabase.from('user_reading_history').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(50);
  return NextResponse.json({ history: data || [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { error } = await supabase.from('user_reading_history').upsert({
    user_id: user.id,
    post_id: body.post_id,
    progress: body.progress || 0,
    time_spent: body.time_spent || 0,
    completed: body.completed || false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,post_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
