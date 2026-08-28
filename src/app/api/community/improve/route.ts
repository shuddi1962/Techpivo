import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';
import { isSameOrigin } from '@/lib/csrf';
import { CONTENT_TYPE_META } from '@/lib/community-types';
import { resolveOpenRouterKey, resolveOpenRouterModel } from '@/lib/openrouter-model';

const MAX_INPUT = 3000;

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to use AI suggestions.' }, { status: 401 });

  const rl = await checkRateLimit(`improve:${user.id}`, RATE_LIMITS.quizAttempt);
  if (!rl.allowed) return NextResponse.json({ error: 'Slow down — try again in a minute.' }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const title = (body.title as string | undefined)?.trim().slice(0, 300) || '';
  const content = (body.content as string | undefined)?.trim().slice(0, MAX_INPUT) || '';
  const contentType = CONTENT_TYPE_META[(body.content_type as keyof typeof CONTENT_TYPE_META) || 'question'];

  if (!title && !content) {
    return NextResponse.json({ error: 'Nothing to improve yet — write a title or some details first.' }, { status: 400 });
  }

  const apiKey = await resolveOpenRouterKey();
  if (!apiKey) {
    return NextResponse.json({ error: 'AI suggestions are not configured on this deployment.' }, { status: 503 });
  }

  const prompt = `You are an editor for a developer community. Improve the following post draft for ${contentType?.label ?? 'a question'}.

Rules:
- Keep the author's facts and intent unchanged.
- Tighten wording, fix grammar, improve clarity and searchability.
- Return ONLY valid JSON with this shape:
  {"title": "improved title (max 120 chars) or null if fine", "content": "improved body (max 3000 chars) or null if fine", "summary": "one sentence on what you changed (max 120 chars)"}
- Do not invent technical details.

Title: ${title || '(none)'}
Body: ${content || '(none)'}`;

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
        max_tokens: 3500,
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `AI service returned ${res.status}. Try again shortly.` }, { status: 502 });
    }
    const data = await res.json();
    const raw = (data?.choices?.[0]?.message?.content || '').trim();
    const json = raw.replace(/```json|```/g, '').trim();
    const start = json.indexOf('{');
    const end = json.lastIndexOf('}');
    if (start === -1 || end <= start) {
      return NextResponse.json({ error: 'AI returned an unexpected response. Try again.' }, { status: 502 });
    }
    const parsed = JSON.parse(json.slice(start, end + 1));
    return NextResponse.json({
      title: typeof parsed.title === 'string' ? parsed.title.slice(0, 120) : null,
      content: typeof parsed.content === 'string' ? parsed.content.slice(0, MAX_INPUT) : null,
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 160) : '',
    });
  } catch {
    return NextResponse.json({ error: 'AI service timed out. Try again.' }, { status: 502 });
  }
}