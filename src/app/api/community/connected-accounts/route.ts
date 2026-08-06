import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PROVIDERS = [
  { id: 'google', name: 'Google', icon: '🔵' },
  { id: 'github', name: 'GitHub', icon: '⚫' },
  { id: 'twitter', name: 'X (Twitter)', icon: '🐦' },
];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ accounts: [] });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('social_links')
    .eq('id', user.id)
    .single();

  const socialLinks = (profile?.social_links || {}) as Record<string, string>;
  const accounts = PROVIDERS.map(p => ({
    ...p,
    connected: !!socialLinks[p.id],
    url: socialLinks[p.id] || null,
  }));

  return NextResponse.json({ accounts });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { provider_id, url } = body;
  if (!provider_id || !url) {
    return NextResponse.json({ error: 'provider_id and url are required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('social_links')
    .eq('id', user.id)
    .single();

  const socialLinks = { ...((profile?.social_links || {}) as Record<string, string>), [provider_id]: url };

  const { error } = await supabase
    .from('user_profiles')
    .update({ social_links: socialLinks, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { provider_id } = body;
  if (!provider_id) {
    return NextResponse.json({ error: 'provider_id is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('social_links')
    .eq('id', user.id)
    .single();

  const socialLinks = { ...((profile?.social_links || {}) as Record<string, string>) };
  delete socialLinks[provider_id];

  const { error } = await supabase
    .from('user_profiles')
    .update({ social_links: socialLinks, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
