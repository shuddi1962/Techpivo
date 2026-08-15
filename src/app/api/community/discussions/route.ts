import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getForumCategories } from '@/lib/community';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';
import { isSameOrigin } from '@/lib/csrf';
import { slugify } from '@/lib/community-types';

const str = (v: unknown, max = 50000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function GET() {
  const categories = await getForumCategories();
  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
  }
  const rl = checkRateLimit(`forum-post:${clientIp(request)}`, RATE_LIMITS.postCreate);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many posts. Try again later.' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const title = str(body.title, 200);
  if (title.length < 5) return NextResponse.json({ error: 'Title must be at least 5 characters.' }, { status: 400 });
  const content = str(body.content);
  if (content.length < 15) {
    return NextResponse.json({ error: 'Please add a bit more detail (at least 15 characters).' }, { status: 400 });
  }
  const categoryId = typeof body.category_id === 'string' && body.category_id ? body.category_id : null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const base = slugify(title) || 'discussion';
  let slug = base;
  const { data: taken } = await supabase.from('forum_posts').select('slug').like('slug', `${base}%`);
  const existingSet = new Set((taken ?? []).map(r => r.slug));
  if (existingSet.has(slug)) {
    for (let i = 2; i < 100; i++) {
      const candidate = `${base}-${i}`;
      if (!existingSet.has(candidate)) { slug = candidate; break; }
    }
  }

  const { data, error } = await supabase
    .from('forum_posts')
    .insert({
      category_id: categoryId,
      author_id: user.id,
      title,
      content,
      tags: Array.isArray(body.tags) ? body.tags.map((t: unknown) => String(t).slice(0, 30)).slice(0, 8) : [],
      slug,
      content_type: 'discussion',
      question_status: 'new',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ post: data });
}
