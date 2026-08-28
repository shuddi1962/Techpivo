import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@/lib/supabase/admin';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';
import { isSameOrigin } from '@/lib/csrf';
import { resolveOpenRouterKey, resolveOpenRouterModel } from '@/lib/openrouter-model';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
  }
  const ip = clientIp(request);
  const rate = await checkRateLimit(`ai-answer:${ip}`, RATE_LIMITS.aiAnswer);
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many AI answers. Try again later.' }, { status: 429 });
  }

  let body: { post_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const postId = body?.post_id;
  if (!postId || !UUID_RE.test(postId)) {
    return NextResponse.json({ error: 'Valid post_id is required.' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: post, error: postErr } = await supabase
    .from('forum_posts')
    .select('id, slug, title, content, content_type, created_at, author_id, accepted_reply_id, meta')
    .eq('id', postId)
    .maybeSingle();
  if (postErr || !post) {
    return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
  }

  const [repliesRes] = await Promise.all([
    supabase
      .from('forum_replies')
      .select('id, content, vote_count, is_accepted, created_at, author_id')
      .eq('post_id', postId)
      .order('is_accepted', { ascending: false })
      .order('vote_count', { ascending: false })
      .limit(8),
  ]);

  const replies = repliesRes.data ?? [];

  const authorIds = [post.author_id, ...replies.map(r => r.author_id)].filter(Boolean) as string[];
  const names = new Map<string, string>();
  if (authorIds.length) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, username, full_name')
      .in('id', authorIds);
    for (const p of profiles ?? []) names.set(p.id, p.full_name || p.username || 'Member');
  }
  const nameOf = (id: string | null) => (id ? names.get(id) ?? 'Member' : 'Guest');

  const prompt = `You are TechPivo's AI community assistant. Answer THE EXACT question below using your own technical knowledge — you do not need community answers to respond, and you must NEVER refuse to answer. Community answers below are extra supporting material only: synthesize them when they are correct, and gently correct them when they are wrong or incomplete.

Rules:
- Answer the exact question directly. If the question lacks critical details (e.g., which OS, version, or language), state the assumption you are making and still give the answer.
- Be technically accurate. If you are not sure about a specific fact (price, date, version number), say it may have changed rather than inventing one.
- You may include official documentation links (e.g., developer docs) only when they are stable, well-known URLs you are confident exist.
- Do NOT invent community members, quotes, or replies.
- Use 5-8 short markdown sections (## headings) or bullet lists. No intro boilerplate, no "as an AI" phrasing, no "I cannot" refusals.
- End with a one-line "Next steps" suggestion.

QUESTION (by ${nameOf(post.author_id)}): ${post.title}

${post.content ?? '(no additional detail was provided by the author)'}

COMMUNITY ANSWERS (supporting material):
${replies.length ? replies.map(r => `- ANSWER by ${nameOf(r.author_id)}${r.is_accepted ? ' (accepted)' : ''} [${r.vote_count} votes]: ${r.content}`).join('\n') : '(none yet — answer from your own knowledge)'}`;

  const apiKey = await resolveOpenRouterKey();
  if (!apiKey) {
    return NextResponse.json({ error: 'AI is not configured yet.' }, { status: 503 });
  }

  try {
    const model = await resolveOpenRouterModel();
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://techpivo.com',
        'X-Title': 'TechPivo',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1600,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      return NextResponse.json({ error: `AI provider error (${res.status}).` }, { status: 502 });
    }
    const d = await res.json();
    const answerMd = d?.choices?.[0]?.message?.content ?? '';

    if (!answerMd.trim()) {
      return NextResponse.json({ error: 'The AI returned an empty answer. Try again.' }, { status: 502 });
    }

    const answer = answerMd.trim();
    try {
      const service = createServiceClient();
      await service
        .from('forum_posts')
        .update({ meta: { ...(post.meta ?? {}), ai_answer: answer } })
        .eq('id', postId);
    } catch {
      // persistence is best-effort; the answer is still returned
    }

    return NextResponse.json({ answer_md: answer });
  } catch (e) {
    console.error('[ai-answer]', e);
    return NextResponse.json({ error: 'Failed to generate an AI answer.' }, { status: 502 });
  }
}