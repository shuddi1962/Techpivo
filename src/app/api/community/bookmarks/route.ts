import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ bookmarks: [] });
  const { data } = await supabase.from('user_bookmarks').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  return NextResponse.json({ bookmarks: data || [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { error } = await supabase.from('user_bookmarks').upsert({ user_id: user.id, item_type: body.item_type, item_id: body.item_id, folder: body.folder || 'default' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
