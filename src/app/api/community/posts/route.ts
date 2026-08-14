import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@/lib/supabase/admin';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';
import { slugify } from '@/lib/community-types';

const CONTENT_TYPES = new Set(['question', 'discussion', 'poll', 'quiz', 'ama', 'showcase', 'debate']);
const DIFFICULTIES = new Set(['beginner', 'intermediate', 'advanced']);
const URL_HOST = /^[a-zA-Z0-9.-]+\.[a-z]{2,}$/i;

const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const cleanTag = (t: unknown) =>
  str(t, 30).toLowerCase().replace(/[^a-z0-9+.\-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
const bool = (v: unknown) => v === true;

function validateUrl(v: unknown): string | null {
  const s = str(v, 500);
  if (!s) return null;
  try {
    const u = new URL(s);
    if ((u.protocol !== 'https:' && u.protocol !== 'http:') || !URL_HOST.test(u.hostname)) return null;
    return s;
  } catch {
    return null;
  }
}

async function resolveTopics(
  service: ReturnType<typeof createServiceClient>,
  tags: string[],
  userId: string
): Promise<{ topic_id: string }[]> {
  if (tags.length === 0) return [];
  const { data: existing } = await service.from('topics').select('id, slug').in('slug', tags);
  const found = new Set((existing ?? []).map(t => t.slug));
  const missing = tags.filter(t => !found.has(t));
  const created: { id: string }[] = [];
  for (const slug of missing) {
    const { data } = await service
      .from('topics')
      .insert({ slug, name: slug, created_by: userId })
      .select('id')
      .single();
    if (data) created.push(data);
  }
  return [
    ...(existing ?? []).map(t => ({ topic_id: t.id })),
    ...created.map(t => ({ topic_id: t.id })),
  ];
}

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(`post-create:${clientIp(request)}`, RATE_LIMITS.postCreate);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many posts. Try again later.' }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to create a post.' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const type = str(body.content_type, 20).toLowerCase();
  if (!CONTENT_TYPES.has(type)) {
    return NextResponse.json({ error: `Unsupported content type "${type}"` }, { status: 400 });
  }

  const title = str(body.title, 200);
  if (title.length < 5 || title.length > 200) {
    return NextResponse.json({ error: 'Title must be between 5 and 200 characters.' }, { status: 400 });
  }

  const content = str(body.content, 50000);
  const requiresContent = type !== 'poll' && type !== 'quiz';
  if (requiresContent && content.length < 15) {
    return NextResponse.json({ error: 'Please add a bit more detail (at least 15 characters).' }, { status: 400 });
  }

  const rawTags = Array.isArray(body.tags) ? body.tags : [];
  const tags = [...new Set(rawTags.map(cleanTag).filter(t => t.length >= 2))].slice(0, 8);

  const difficulty = DIFFICULTIES.has(str(body.difficulty, 20)) ? str(body.difficulty, 20) : null;

  const service = createServiceClient();

  const { data: categories } = await service.from('forum_categories').select('id, slug, name').order('name');
  let categoryId: string | null = null;
  if (typeof body.category_id === 'string' && body.category_id) {
    const found = categories?.find(c => c.id === body.category_id);
    if (found) categoryId = found.id;
  }
  if (!categoryId && typeof body.category === 'string' && body.category) {
    const cat = body.category;
    const found = categories?.find(c => c.slug === cat || c.name.toLowerCase() === cat.toLowerCase());
    if (found) categoryId = found.id;
  }
  if (!categoryId && categories && categories.length > 0) categoryId = categories[0].id;
  if (!categoryId) return NextResponse.json({ error: 'No forum category available.' }, { status: 400 });
  const categorySlug = categories?.find(c => c.id === categoryId)?.slug ?? 'general';

  const base = slugify(title) || 'post';
  let slug = base;
  const { data: taken } = await service.from('forum_posts').select('slug').like('slug', `${base}%`);
  const existingSet = new Set((taken ?? []).map(r => r.slug));
  if (existingSet.has(slug)) {
    for (let i = 2; i < 100; i++) {
      const candidate = `${base}-${i}`;
      if (!existingSet.has(candidate)) { slug = candidate; break; }
    }
  }

  const meta: Record<string, unknown> = {};
  let pollPayload: Record<string, unknown> | null = null;
  let quizPayload: { quiz: Record<string, unknown>; questions: Record<string, unknown>[] } | null = null;

  // ── Type-specific validation ────────────────────────────────────────────
  if (type === 'poll') {
    const options = (Array.isArray(body.options) ? body.options : []).map(o => str(o, 80)).filter(Boolean);
    if (options.length < 2 || options.length > 10) {
      return NextResponse.json({ error: 'Polls need between 2 and 10 options.' }, { status: 400 });
    }
    if (new Set(options).size !== options.length) {
      return NextResponse.json({ error: 'Poll options must be unique.' }, { status: 400 });
    }
    const days = [1, 3, 7, 30].includes(Number(body.expires_in_days)) ? Number(body.expires_in_days) : null;
    pollPayload = {
      title,
      description: content || null,
      community_post_id: null,
      allow_change: bool(body.allow_change),
      allow_multiple: bool(body.allow_multiple),
      is_anonymous: bool(body.is_anonymous),
      is_active: true,
      expires_at: days ? new Date(Date.now() + days * 86400000).toISOString() : null,
      options,
    };
  }

  if (type === 'quiz') {
    const questions = Array.isArray(body.questions) ? body.questions : [];
    if (questions.length < 1 || questions.length > 20) {
      return NextResponse.json({ error: 'Quizzes need between 1 and 20 questions.' }, { status: 400 });
    }
    const clean: Record<string, unknown>[] = [];
    for (const [i, q] of questions.entries()) {
      const qObj = q as Record<string, unknown>;
      const question = str(qObj.question, 500);
      const qType = str(qObj.question_type, 20) || 'multiple_choice';
      const opts = (Array.isArray(qObj.options) ? qObj.options : []).map(o => str(o, 200)).filter(Boolean);
      if (question.length < 3 || opts.length < 2 || opts.length > 6 || new Set(opts).size !== opts.length) {
        return NextResponse.json({ error: `Question ${i + 1} needs 2-6 unique options and a prompt.` }, { status: 400 });
      }
      const correctIdx = Number(qObj.correct_index);
      if (!Number.isInteger(correctIdx) || correctIdx < 0 || correctIdx >= opts.length) {
        return NextResponse.json({ error: `Question ${i + 1} needs a valid correct answer.` }, { status: 400 });
      }
      clean.push({
        question,
        question_type: qType,
        options: opts,
        correct_answer: JSON.stringify([opts[correctIdx]]),
        explanation: str(qObj.explanation, 500) || null,
        points: Math.min(10, Math.max(1, Number(qObj.points) || 1)),
        sort_order: i,
      });
    }
    quizPayload = {
      quiz: {
        title,
        description: content || null,
        difficulty: difficulty ?? 'beginner',
        time_limit: [0, 300, 600, 900, 1800].includes(Number(body.time_limit_seconds)) ? Number(body.time_limit_seconds) : 0,
        question_count: clean.length,
        is_published: true,
      },
      questions: clean,
    };
  }

  if (type === 'ama') {
    meta.host = str(body.host, 100) || null;
    meta.guests = (Array.isArray(body.guests) ? body.guests : []).map(g => str(g, 100)).filter(Boolean).slice(0, 8);
    meta.start_at = typeof body.start_at === 'string' && body.start_at ? body.start_at : null;
    meta.end_at = typeof body.end_at === 'string' && body.end_at ? body.end_at : null;
  }

  if (type === 'showcase') {
    const demoUrl = validateUrl(body.demo_url);
    const repoUrl = validateUrl(body.repo_url);
    if ((body.demo_url && !demoUrl) || (body.repo_url && !repoUrl)) {
      return NextResponse.json({ error: 'Demo/repo URLs must be valid http(s) links.' }, { status: 400 });
    }
    meta.tech_stack = (Array.isArray(body.tech_stack) ? body.tech_stack : []).map(s => str(s, 30)).filter(Boolean).slice(0, 12);
    meta.demo_url = demoUrl;
    meta.repo_url = repoUrl;
    const modes = new Set(['', 'bug_reports', 'ux_review', 'security_review', 'performance_review']);
    meta.feedback_mode = modes.has(str(body.feedback_mode, 30)) ? str(body.feedback_mode, 30) : null;
  }

  if (type === 'debate') {
    const positionFor = str(body.position_for, 200);
    const positionAgainst = str(body.position_against, 200);
    if (positionFor.length < 3 || positionAgainst.length < 3) {
      return NextResponse.json({ error: 'Debate needs both positions (3+ chars each).' }, { status: 400 });
    }
    meta.position_for = positionFor;
    meta.position_against = positionAgainst;
  }

  const questionStatus = type === 'question' ? (content.length >= 60 ? 'unanswered' : 'needs_context') : null;
  const bounty = type === 'question' ? Math.min(500, Math.max(0, Number(body.bounty_points) || 0)) : 0;

  // ── Insert post + sub-resources (best-effort cleanup on failure) ───────
  const { data: post, error: postError } = await service
    .from('forum_posts')
    .insert({
      category_id: categoryId,
      author_id: user.id,
      title,
      content,
      tags,
      slug,
      content_type: type,
      question_status: questionStatus,
      difficulty,
      bounty_points: bounty,
      excerpt: content.length > 240 ? content.slice(0, 240) + '…' : content || null,
      meta: Object.keys(meta).length ? meta : null,
    })
    .select()
    .single();

  if (postError) return NextResponse.json({ error: postError.message }, { status: 400 });

  const postId = post.id;
  const topicLinks = tags.length > 0 ? await resolveTopics(service, tags, user.id) : [];
  if (topicLinks.length > 0) {
    const { error: linkError } = await service.from('post_topics').insert(
      topicLinks.map(t => ({ post_id: postId, topic_id: t.topic_id }))
    );
    if (linkError) console.error('post_topics insert failed:', linkError.message);
  }

  let quizId: string | null = null;
  try {
    if (pollPayload) {
      const options = pollPayload.options as string[];
      const { data: poll, error: pollError } = await service
        .from('polls')
        .insert({
          title: pollPayload.title,
          description: pollPayload.description,
          community_post_id: postId,
          allow_change: pollPayload.allow_change,
          allow_multiple: pollPayload.allow_multiple,
          is_anonymous: pollPayload.is_anonymous,
          is_active: pollPayload.is_active,
          expires_at: pollPayload.expires_at,
        })
        .select('id')
        .single();
      if (pollError) throw new Error(`poll: ${pollError.message}`);
      const { error: optError } = await service.from('poll_options').insert(
        options.map((text, i) => ({ poll_id: poll.id, text, vote_count: 0, sort_order: i }))
      );
      if (optError) throw new Error(`poll_options: ${optError.message}`);
    }

    if (quizPayload) {
      const { data: quiz, error: quizError } = await service
        .from('quizzes')
        .insert({
          title: quizPayload.quiz.title,
          description: quizPayload.quiz.description,
          difficulty: quizPayload.quiz.difficulty,
          time_limit: quizPayload.quiz.time_limit,
          question_count: quizPayload.quiz.question_count,
          is_published: quizPayload.quiz.is_published,
          community_post_id: postId,
        })
        .select('id')
        .single();
      if (quizError) throw new Error(`quiz: ${quizError.message}`);
      quizId = quiz.id;
      const { error: qError } = await service.from('quiz_questions').insert(
        quizPayload.questions.map(q => ({ ...q, quiz_id: quiz.id }))
      );
      if (qError) throw new Error(`quiz_questions: ${qError.message}`);
    }
  } catch (e) {
    console.error('sub-resource creation failed, cleaning up post:', e);
    await service.from('forum_posts').delete().eq('id', postId).maybeSingle();
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to create post' }, { status: 400 });
  }

  // Category counter + XP (best effort, never fail the request for these).
  await service.from('forum_categories').select('post_count').eq('id', categoryId).single().then(async ({ data }) => {
    await service.from('forum_categories').update({ post_count: (data?.post_count ?? 0) + 1 }).eq('id', categoryId);
  });
  try {
    await supabase.rpc('award_xp', {
      target_user_id: user.id,
      xp_amount: 40,
      action_name: 'forum_post',
      desc_text: `Created ${type}: ${title.slice(0, 60)}`,
      ref_id: postId,
      ref_type: 'forum_post',
    });
  } catch (e) {
    console.error('award_xp failed:', e);
  }

  const url =
    type === 'question' ? `/answers/${slug}`
    : type === 'discussion' ? `/community/discussions/${slug}`
    : type === 'quiz' && quizId ? `/community/quiz/${quizId}`
    : `/community/forum/${categorySlug}/${postId}`;

  return NextResponse.json({ post, url });
}