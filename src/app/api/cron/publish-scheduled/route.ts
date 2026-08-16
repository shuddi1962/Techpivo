import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isCronAuthorized } from '@/lib/cron-auth'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    if (!(await isCronAuthorized(req, { required: true }))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date().toISOString()

    const { data: due, error } = await supabase
      .from('posts')
      .select('id, slug, scheduled_at')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const published: { id: string; slug: string }[] = []
    for (const post of due || []) {
      const { error: updateErr } = await supabase
        .from('posts')
        .update({
          status: 'published',
          published_at: post.scheduled_at ? post.scheduled_at : now,
          updated_at: now,
        })
        .eq('id', post.id)

      if (updateErr) {
        console.error(`[publish-scheduled] failed for ${post.slug}:`, updateErr.message)
        continue
      }
      published.push(post)
      try {
        revalidatePath('/')
        revalidatePath(`/${post.slug}`)
      } catch {
        // revalidation outside of a request is best-effort; ISR 60s is the safety net
      }
    }

    return NextResponse.json({ checked: due?.length || 0, published })
  } catch (err: any) {
    console.error('publish-scheduled cron error:', err)
    return NextResponse.json({ error: err?.message || 'Cron failed' }, { status: 500 })
  }
}