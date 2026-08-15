import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@/lib/supabase/admin';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';
import { isSameOrigin } from '@/lib/csrf';

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

  const [repliesRes, relatedRes] = await Promise.all([
    supabase
      .from('forum_replies')
      .select('id, content, vote_count, is_accepted, created_at, author_id')
      .eq('post_id', postId)
      .order('is_accepted', { ascending: false })
      .order('vote_count', { ascending: false })
      .limit(8),
    supabase
      .from('forum_posts')
      .select('title, slug, reply_count')
      .eq('content_type', 'question')
      .neq('id', postId)
      .order('reply_count', { ascending: false })
      .limit(5),
  ]);

  const replies = repliesRes.data ?? [];
  const related = relatedRes.data ?? [];

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

  const discussion = [
    `QUESTION (by ${nameOf(post.author_id)}): ${post.title}\n\n${post.content ?? ''}`,
    ...replies.map(r => `ANSWER by ${nameOf(r.author_id)}${r.is_accepted ? ' (accepted)' : ''} [${r.vote_count} votes]:\n${r.content}`),
  ].join('\n\n---\n\n');

  const prompt = `You are TechPivo's community assistant. Write a helpful, concise answer (5-8 short sections or bullet points) to the community question below, grounded ONLY in the provided discussion. Synthesize the best answers; mention when the community is split or uncertain. Do not invent facts, links, prices, or dates. End with a one-line "Next steps" suggestion. Use plain markdown (## headings, - bullets). No intro boilerplate.\n\n${discussion.slice(0, 18000)}${related.length ? `\n\nRELATED TechPivo questions (reference titles only if useful):\n${related.map(r => `- ${r.title}`).join('\n')}` : ''}`;

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI is not configured yet.' }, { status: 503 });
  }

  try {
    let answerMd: string;
    if (process.env.GEMINI_API_KEY) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1600 },
          }),
          signal: AbortSignal.timeout(45000),
        }
      );
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        return NextResponse.json({ error: `AI provider error (${res.status}).` }, { status: 502 });
      }
      const d = await res.json();
      answerMd = d?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
    } else {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'openrouter/auto',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1600,
        }),
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        return NextResponse.json({ error: `AI provider error (${res.status}).` }, { status: 502 });
      }
      const d = await res.json();
      answerMd = d?.choices?.[0]?.message?.content ?? '';
    }

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