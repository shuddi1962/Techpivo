import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';
import { isSameOrigin } from '@/lib/csrf';

const PROVIDERS = [
  { id: 'google', name: 'Google', icon: '🔵' },
  { id: 'github', name: 'GitHub', icon: '⚫' },
  { id: 'twitter', name: 'X (Twitter)', icon: '🐦' },
];

const VALID_PROVIDER_IDS = new Set(PROVIDERS.map(p => p.id));

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
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
  }
  const rl = checkRateLimit(`connected-accounts:${clientIp(request)}`, RATE_LIMITS.connectedAccounts);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  const body = await request.json();
  const { provider_id, url } = body;
  if (!provider_id || !url) {
    return NextResponse.json({ error: 'provider_id and url are required' }, { status: 400 });
  }
  if (!VALID_PROVIDER_IDS.has(provider_id)) {
    return NextResponse.json({ error: 'Invalid provider_id' }, { status: 400 });
  }
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
    return NextResponse.json({ error: 'url must start with http:// or https://' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('social_links')
    .eq('id', user.id)
    .single();

  const socialLinks = { ...((profile?.social_links || {}) as Record<string, string>), [provider_id]: url.trim().slice(0, 500) };

  const { error } = await supabase
    .from('user_profiles')
    .update({ social_links: socialLinks, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
  }
  const rl = checkRateLimit(`connected-accounts:${clientIp(request)}`, RATE_LIMITS.connectedAccounts);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  const body = await request.json();
  const { provider_id } = body;
  if (!provider_id) {
    return NextResponse.json({ error: 'provider_id is required' }, { status: 400 });
  }
  if (!VALID_PROVIDER_IDS.has(provider_id)) {
    return NextResponse.json({ error: 'Invalid provider_id' }, { status: 400 });
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