import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ notifications: [] });
  const { data } = await supabase.from('user_notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30);
  return NextResponse.json({ notifications: data || [] });
}
