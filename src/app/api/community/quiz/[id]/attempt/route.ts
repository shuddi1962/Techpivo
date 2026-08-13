import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(`quiz-attempt:${clientIp(request)}`, RATE_LIMITS.quizAttempt);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many quiz attempts. Try again later.' }, { status: 429 });
  }

  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const answers = (body.answers || {}) as Record<string, string | string[]>;

  // Server-side grading — the client NEVER receives correct answers.
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id')
    .eq('id', id)
    .eq('is_published', true)
    .single();
  if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('id, question, correct_answer, explanation, points')
    .eq('quiz_id', id);

  if (!questions || questions.length === 0) {
    return NextResponse.json({ error: 'Quiz has no questions' }, { status: 400 });
  }

  const parseExpected = (raw: string): string[] => {
    const trimmed = String(raw ?? '').trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch { /* fall through to single-value */ }
    }
    return [trimmed];
  };
  const normalize = (v: string | string[] | undefined): string[] =>
    Array.isArray(v) ? v.map(String) : v ? [String(v)] : [];

  let correct = 0;
  let score = 0;
  const total = questions.length;
  const results: { question_id: string; correct: boolean; explanation: string | null }[] = [];
  for (const q of questions) {
    const expected = parseExpected(q.correct_answer);
    const given = normalize(answers[q.id]);
    const isCorrect =
      given.length === expected.length && given.every(v => expected.includes(v));
    if (isCorrect) {
      correct += 1;
      score += q.points || 1;
    }
    results.push({ question_id: q.id, correct: isCorrect, explanation: q.explanation });
  }
  const totalPoints = (questions || []).reduce((s, q) => s + (q.points || 1), 0);
  if (totalPoints > 0) score = Math.min(score, totalPoints);

  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({
      quiz_id: id,
      user_id: user.id,
      score,
      total_questions: total,
      correct_answers: correct,
      time_taken: typeof body.time_taken === 'number' ? body.time_taken : null,
      answers,
      completed: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  try {
    await supabase.rpc('increment_quiz_stats', { qid: id, new_score: score });
  } catch (e) {
    console.error('increment_quiz_stats failed:', e);
  }

  // XP only on FIRST completed attempt per quiz (prevents retake farming).
  let xpAwarded = false;
  try {
    const { data: prior } = await supabase
      .from('user_xp_log')
      .select('id')
      .eq('user_id', user.id)
      .eq('reason', 'complete_quiz')
      .eq('reference_id', id)
      .limit(1);
    if (!prior || prior.length === 0) {
      await supabase.rpc('award_xp', {
        target_user_id: user.id,
        xp_amount: 20,
        action_name: 'complete_quiz',
        desc: `Completed quiz: ${id}`,
      });
      xpAwarded = true;
    }
  } catch (e) {
    console.error('award_xp failed:', e);
  }

  return NextResponse.json({
    attempt: data,
    score,
    correct_answers: correct,
    total_questions: total,
    xp_awarded: xpAwarded,
    results,
  });
}