import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/admin'

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/indexing'],
  })
}

export async function submitToGoogleIndexing(url: string): Promise<boolean> {
  try {
    const indexing = google.indexing({ version: 'v3', auth: getAuth() })
    await indexing.urlNotifications.publish({
      requestBody: { url, type: 'URL_UPDATED' },
    })
    return true
  } catch (e) {
    console.warn('[Google Indexing]', url.slice(-40), String(e).slice(0, 80))
    return false
  }
}

export async function processPendingIndexingQueue(): Promise<void> {
  const supabase = createClient()
  const { data: pending } = await supabase
    .from('google_indexing_queue')
    .select('id, url')
    .eq('status', 'pending')

  if (!pending?.length) return

  for (const item of pending) {
    const ok = await submitToGoogleIndexing(item.url)
    await supabase.from('google_indexing_queue')
      .update({
        status:       ok ? 'submitted' : 'failed',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', item.id)
    await new Promise(r => setTimeout(r, 500))
  }
}
