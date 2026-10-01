import { createClient } from "@/lib/supabase/admin";
import { titleOverlaps } from "@/lib/duplicate-check";

/**
 * TechPivo Intelligence — community demand signals (SERVER-ONLY).
 * Everything derives from REAL community rows: repeated questions (grouped by
 * fuzzy title overlap), most-voted discussions, unanswered questions, and
 * poll engagement. No fabricated demand.
 */

export interface CommunitySignal {
  kind: "repeated_questions" | "top_discussion" | "unanswered" | "poll";
  topic: string;
  count: number;
  evidence: string;
  ref: string;
}

/** Top repeated-question clusters + hot discussions + polls. */
export async function getCommunitySignals(limit = 15): Promise<{ signals: CommunitySignal[]; measuredAt: string }> {
  const supabase = createClient();
  const signals: CommunitySignal[] = [];

  const { data: posts } = await supabase
    .from("forum_posts")
    .select("id, title, vote_count, reply_count, category_id, created_at")
    .order("created_at", { ascending: false })
    .limit(400);
  const rows = (posts ?? []) as Array<{ id: string; title: string; vote_count: number | null; reply_count: number | null; category_id: string | null; created_at: string }>;

  // Cluster repeated questions by fuzzy overlap.
  const clusters: Array<{ topic: string; ids: string[]; votes: number }> = [];
  for (const p of rows) {
    const title = (p.title ?? "").trim();
    if (title.length < 8) continue;
    const hit = clusters.find((c) => titleOverlaps(title, c.topic) || titleOverlaps(c.topic, title));
    if (hit) {
      hit.ids.push(p.id);
      hit.votes += p.vote_count ?? 0;
    } else {
      clusters.push({ topic: title.slice(0, 80), ids: [p.id], votes: p.vote_count ?? 0 });
    }
  }
  for (const c of clusters.filter((c) => c.ids.length >= 3).sort((a, b) => b.ids.length - a.ids.length).slice(0, 5)) {
    signals.push({
      kind: "repeated_questions",
      topic: c.topic,
      count: c.ids.length,
      evidence: `Asked ${c.ids.length}× in community discussions (${c.votes} combined votes).`,
      ref: `/community/forum`,
    });
  }

  // Top-voted discussions (demand by votes).
  for (const p of [...rows].sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0)).slice(0, 5)) {
    if ((p.vote_count ?? 0) < 2) break;
    signals.push({
      kind: "top_discussion",
      topic: (p.title ?? "").slice(0, 80),
      count: p.vote_count ?? 0,
      evidence: `${p.vote_count} votes, ${p.reply_count ?? 0} replies.`,
      ref: `/community/forum`,
    });
  }

  // Unanswered questions: posts with zero replies older than 7 days.
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const unanswered = rows.filter((p) => (p.reply_count ?? 0) === 0 && +new Date(p.created_at) < weekAgo);
  if (unanswered.length > 0) {
    signals.push({
      kind: "unanswered",
      topic: `${unanswered.length} questions older than 7 days have zero replies`,
      count: unanswered.length,
      evidence: "Unanswered demand — each is a candidate explainer/tutorial.",
      ref: `/community/forum`,
    });
  }

  // Poll engagement.
  const { data: polls } = await supabase
    .from("polls")
    .select("id, question, total_votes")
    .order("total_votes", { ascending: false })
    .limit(3);
  for (const poll of (polls ?? []) as Array<{ id: string; question: string; total_votes: number | null }>) {
    if ((poll.total_votes ?? 0) < 3) continue;
    signals.push({
      kind: "poll",
      topic: (poll.question ?? "").slice(0, 80),
      count: poll.total_votes ?? 0,
      evidence: `${poll.total_votes} community votes.`,
      ref: `/community/polls`,
    });
  }

  return { signals: signals.slice(0, limit), measuredAt: new Date().toISOString() };
}
