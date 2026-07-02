import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ profile: null });
  const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
  return NextResponse.json({ profile: data });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      id: user.id,
      username: body.username,
      full_name: body.full_name,
      bio: body.bio,
      location: body.location,
      website: body.website,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: data });
}
