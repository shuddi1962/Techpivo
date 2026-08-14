import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole, createServiceClient } from '@/lib/admin-auth';

const TARGET_LABELS: Record<string, string> = {
  forum_post: 'Post',
  forum_reply: 'Reply',
  comment: 'Comment',
  user: 'User',
};

async function fetchReportRows(service: ReturnType<typeof createServiceClient>) {
  const { data: reports } = await service
    .from('content_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  const rows = reports || [];

  // reporter_id has no FK — batch-fetch profiles separately and merge.
  const reporterIds = [...new Set(rows.map(r => r.reporter_id).filter(Boolean))] as string[];
  const reporters = new Map<string, { username: string | null; full_name: string | null; avatar_url: string | null }>();
  if (reporterIds.length > 0) {
    const { data: profiles } = await service
      .from('user_profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', reporterIds);
    for (const p of profiles || []) reporters.set(p.id, p);
  }

  return rows.map(r => ({ ...r, reporter: reporters.get(r.reporter_id) ?? null }));
}

async function fetchTargetPreview(service: ReturnType<typeof createServiceClient>, type: string, id: string) {
  try {
    if (type === 'forum_post') {
      const { data } = await service
        .from('forum_posts')
        .select('id, title, content, author_id, is_locked, created_at')
        .eq('id', id)
        .single();
      return data || null;
    }
    if (type === 'forum_reply') {
      const { data } = await service
        .from('forum_replies')
        .select('id, content, author_id, created_at, post:forum_replies_post_id_fkey(id, title)')
        .eq('id', id)
        .single();
      return data || null;
    }
    if (type === 'comment') {
      const { data } = await service
        .from('article_discussions')
        .select('id, content, author_id, is_approved, created_at')
        .eq('id', id)
        .single();
      return data || null;
    }
    if (type === 'user') {
      const { data } = await service
        .from('user_profiles')
        .select('id, username, full_name, avatar_url, level, xp')
        .eq('id', id)
        .single();
      return data || null;
    }
  } catch {
    // target may have been deleted
  }
  return null;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(['admin', 'editor'], request);
  if (!auth.ok) return auth.response;

  const service = createServiceClient();
  const reports = await fetchReportRows(service);

  const enriched = [];
  for (const r of reports) {
    const target = await fetchTargetPreview(service, r.target_type, r.target_id);
    enriched.push({ ...r, target_label: TARGET_LABELS[r.target_type] || r.target_type, target });
  }

  // author_id has no FK — batch-fetch author profiles and attach.
  const authorIds = [
    ...new Set(
      enriched
        .filter(e => e.target?.author_id && e.target_type !== 'user')
        .map(e => e.target.author_id)
    ),
  ] as string[];
  const authors = new Map<string, { username: string | null; full_name: string | null }>();
  if (authorIds.length > 0) {
    const { data: profiles } = await service
      .from('user_profiles')
      .select('id, username, full_name')
      .in('id', authorIds);
    for (const p of profiles || []) authors.set(p.id, p);
  }
  for (const e of enriched) {
    if (e.target?.author_id && e.target_type !== 'user') {
      e.target.author = authors.get(e.target.author_id) ?? null;
    }
  }

  const { count: openCount } = await service
    .from('content_reports')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pending', 'under_review']);

  return NextResponse.json({
    reports: enriched,
    stats: {
      open: openCount || 0,
      total: enriched.length,
      pending_today: enriched.filter(r => {
        const d = new Date(r.created_at);
        return d >= new Date(Date.now() - 86400000) && !['resolved', 'dismissed'].includes(r.status);
      }).length,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(['admin', 'editor'], request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const action = body.action as string;
  const service = createServiceClient();

  if (action === 'dismiss') {
    const id = body.id as string;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const { error } = await service
      .from('content_reports')
      .update({ status: 'dismissed', resolved_by: auth.user.id, resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await logAudit(service, auth.user.id, `Dismissed report ${id}`);
    return NextResponse.json({ ok: true });
  }

  if (action === 'remove') {
    const id = body.id as string;
    const targetType = body.target_type as string;
    const targetId = body.target_id as string;
    if (!id || !targetType || !targetId) return NextResponse.json({ error: 'id, target_type, target_id required' }, { status: 400 });

    if (targetType === 'forum_post') {
      await service.from('forum_posts').update({
        is_locked: true,
        meta: { hidden: true },
      }).eq('id', targetId);
    } else if (targetType === 'forum_reply') {
      await service.from('forum_replies').delete().eq('id', targetId);
    } else if (targetType === 'comment') {
      await service.from('article_discussions').update({ is_approved: false }).eq('id', targetId);
    } else if (targetType === 'user') {
      // Warn path below — removal of a user profile isn't supported.
      return NextResponse.json({ error: 'Use "warn" for user reports.' }, { status: 400 });
    } else {
      return NextResponse.json({ error: 'Unsupported target type.' }, { status: 400 });
    }

    const { error } = await service
      .from('content_reports')
      .update({ status: 'resolved', resolved_by: auth.user.id, resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await logAudit(service, auth.user.id, `Removed ${targetType} ${targetId} (report ${id})`);
    return NextResponse.json({ ok: true });
  }

  if (action === 'warn') {
    const id = body.id as string;
    const userId = body.user_id as string;
    const note = typeof body.note === 'string' ? body.note.slice(0, 300) : '';
    if (!id || !userId) return NextResponse.json({ error: 'id and user_id required' }, { status: 400 });

    await service.from('user_notifications').insert({
      user_id: userId,
      type: 'moderation',
      title: 'Content warning',
      message: `A moderator flagged your content. ${note || 'Please review the community guidelines.'}`,
      link: '/community',
    });
    const { error } = await service
      .from('content_reports')
      .update({ status: 'resolved', resolved_by: auth.user.id, resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await logAudit(service, auth.user.id, `Warned user ${userId} (report ${id})`);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

async function logAudit(service: ReturnType<typeof createServiceClient>, actorId: string, action: string) {
  try {
    await service.from('audit_logs').insert({
      user_id: actorId,
      action,
      entity_type: 'content_reports',
      entity_id: null,
      details: { action },
    });
  } catch {
    // audit best-effort
  }
}