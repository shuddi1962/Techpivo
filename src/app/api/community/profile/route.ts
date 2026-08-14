import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';
import { isSameOrigin } from '@/lib/csrf';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ profile: null });
  const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
  return NextResponse.json({ profile: data });
}

export async function PUT(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
  }
  const rl = checkRateLimit(`profile:${clientIp(request)}`, RATE_LIMITS.profileUpdate);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many profile updates. Try again later.' }, { status: 429 });
  }

  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Validate + sanitize inputs
  const clean: Record<string, unknown> = { id: user.id, updated_at: new Date().toISOString() };
  if (typeof body.username === 'string') clean.username = body.username.slice(0, 50);
  if (typeof body.full_name === 'string') clean.full_name = body.full_name.slice(0, 100);
  if (typeof body.bio === 'string') clean.bio = body.bio.slice(0, 2000);
  if (typeof body.location === 'string') clean.location = body.location.slice(0, 100);
  if (typeof body.website === 'string') {
    // URL scheme allowlist — only http/https
    const url = body.website.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'website must start with http:// or https://' }, { status: 400 });
    }
    clean.website = url ? url.slice(0, 500) : null;
  } else if (body.website === null) {
    clean.website = null; // explicit clear
  }
  if (typeof body.avatar_url === 'string') clean.avatar_url = body.avatar_url.slice(0, 1000);
  else if (body.avatar_url === null) clean.avatar_url = null;
  if (typeof body.cover_url === 'string') clean.cover_url = body.cover_url.slice(0, 1000);
  else if (body.cover_url === null) clean.cover_url = null;
  if (body.social_links && typeof body.social_links === 'object') {
    const links: Record<string, string> = {};
    for (const [k, v] of Object.entries(body.social_links)) {
      if (typeof v === 'string' && /^https?:\/\//i.test(v.trim())) {
        links[k.slice(0, 50)] = v.slice(0, 500);
      }
    }
    clean.social_links = links;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(clean)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: data });
}