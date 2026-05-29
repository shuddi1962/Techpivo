import { NextRequest, NextResponse }      from 'next/server'
import { RSS_FEEDS }                       from '@/lib/rss-feeds'
import { rewriteArticle, type BlizineArticle }      from '@/lib/ai-rewriter'
import { createClient }                    from '@/lib/supabase/admin'

const DAILY_CAP = 20

const BOT_UA = 'Mozilla/5.0 (compatible; Blizine/1.0; +https://blizine.com/bot)'

function isAuthorised(req: NextRequest): boolean {
  const auth = req.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return false
  const token = auth.slice(7)
  return token === process.env.CRON_SECRET
}

async function validateImageUrl(url: string | null | undefined): Promise<string | null> {
  if (!url || !url.startsWith('http')) return null

  const lower = url.toLowerCase()
  const REJECT_PATTERNS = [
    'logo', 'icon', 'favicon', 'avatar', 'badge',
    'pixel', 'tracker', 'tracking', 'spacer', '1x1',
    '.svg', '.gif', 'data:', 'gravatar', 'default-avatar',
  ]
  if (REJECT_PATTERNS.some(p => lower.includes(p))) return null

  const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp']
  const hasImageExt = IMAGE_EXTS.some(ext => lower.includes(ext))

  if (!hasImageExt) {
    try {
      const head = await fetch(url, {
        method:  'HEAD',
        headers: { 'User-Agent': BOT_UA },
        signal:  AbortSignal.timeout(5000),
      })
      const ct = head.headers.get('content-type') || ''
      if (!ct.startsWith('image/')) return null
      if (ct === 'image/svg+xml') return null
      const cl = parseInt(head.headers.get('content-length') || '0')
      if (cl > 0 && cl < 5000) return null
    } catch {
      return null
    }
  }

  return url
}

function extractRawImage(itemXml: string): string | null {
  const mc = itemXml.match(/<media:content[^>]+url=["']([^"']+)["'][^>]*\/?>(?:[\s\S]*?<\/media:content>)?/i)
  if (mc?.[1] && !mc[1].toLowerCase().includes('.svg')) return mc[1]

  const mt = itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["'][^>]*\/?>(?:[\s\S]*?<\/media:thumbnail>)?/i)
  if (mt?.[1] && !mt[1].toLowerCase().includes('.svg')) return mt[1]

  const enc = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image\/[^"']+["'][^>]*\/?>/i)
  if (enc?.[1]) return enc[1]

  const ce = itemXml.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i)
  if (ce?.[1]) {
    const img = ce[1].match(/<img[^>]+src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']{0,200})["']/i)
    if (img?.[1]) return img[1]
  }

  const desc = itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/i)
  if (desc?.[1]) {
    const img = desc[1].match(/<img[^>]+src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']{0,200})["']/i)
    if (img?.[1]) return img[1]
  }

  return null
}

async function fetchOgImage(url: string): Promise<string | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': BOT_UA, 'Accept': 'text/html' },
        signal:  AbortSignal.timeout(8000),
      })
      const html = await res.text()
      const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                 || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
      if (og?.[1]?.startsWith('http')) return og[1]
      const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      if (tw?.[1]?.startsWith('http')) return tw[1]
      return null
    } catch {
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000))
    }
  }
  return null
}

const CATEGORY_FALLBACKS: Record<string, string> = {
  'tech-news':        'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80',
  'ai-automation':    'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80',
  'cybersecurity':    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&q=80',
  'gadgets':          'https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=1200&q=80',
  'programming':      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80',
  'web-development':  'https://images.unsplash.com/photo-1547658719-da2b51169166?w=1200&q=80',
  'tutorials':        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80',
  'digital-business': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
  'networking-it':    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80',
  'reviews':          'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&q=80',
  'desktops':         'https://images.unsplash.com/photo-1593640408182-31c228a8b4f4?w=1200&q=80',
}

interface RawItem {
  title:       string
  link:        string
  pubDate:     string
  description: string
  content:     string
  rawImage:    string | null
}

async function parseFeed(url: string): Promise<RawItem[]> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': BOT_UA,
          'Accept':     'application/rss+xml, application/xml, application/atom+xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const xml = await res.text()
      const items: RawItem[] = []

      const itemPattern = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g
      let match: RegExpExecArray | null
      while ((match = itemPattern.exec(xml)) !== null) {
        const x = match[1]
        const get = (tag: string) =>
          x.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
           ?.[1]?.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').trim() || ''

        const link = get('link') || get('guid') || get('id') || ''

        if (!link.startsWith('http')) continue

        const content = get('content:encoded') || get('content') || ''
        const description = get('description') || get('summary') || ''

        const bodyText = content.length > description.length ? content : description
        const plainText = bodyText
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()

        items.push({
          title:       get('title').replace(/<[^>]+>/g,'').trim(),
          link,
          pubDate:     get('pubDate') || get('published') || get('updated') || new Date().toISOString(),
          description: description.replace(/<[^>]+>/g,'').replace(/<!\[CDATA\[|\]\]>/g,'').trim().slice(0, 300),
          content:     plainText.replace(/<!\[CDATA\[|\]\]>/g,'').slice(0, 5000),
          rawImage:    extractRawImage(x),
        })
      }
      return items
    } catch (e) {
      if (attempt < 3) {
        console.warn(`[parseFeed] Attempt ${attempt}/3 failed for ${url}, retrying...`)
        await new Promise(r => setTimeout(r, 2000 * attempt))
      } else {
        console.warn(`[parseFeed] All 3 attempts failed for ${url}: ${e}`)
      }
    }
  }
  return []
}

function makeSlug(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .slice(0, 80)
    .replace(/^-+|-+$/g, '')
    + '-' + Date.now().toString(36)
}

function fingerprint(title: string, pubDate: string): string | null {
  const STOP = new Set(['the','a','an','is','are','was','were','has','have','had',
    'will','can','may','might','new','just','now','its','for','and','but','or',
    'not','this','that','from','with','into','about','says','said','after','over',
    'announces','announced','launches','launched','releases','released','reveals',
    'confirms','confirmed','update','updates','report','reports','how','what','why'])
  const words = title.toLowerCase().replace(/[^a-z0-9\s]/g,'').split(/\s+/)
    .filter(w => w.length > 3 && !STOP.has(w)).sort().slice(0,8)
  if (words.length < 2) return null
  const day = new Date(pubDate || Date.now()).toISOString().slice(0,10)
  return `${day}:${words.join('-')}`
}

function autoCategory(title: string, feedCategory: string, catMap: Record<string, string>): string {
  const t = title.toLowerCase()
  const overrides: Array<{ keywords: string[]; slug: string }> = [
    { keywords: ['hack','vulnerability','breach','ransomware','malware','cve-','exploit','phishing','zero-day','cybersec','infosec','password leak','data breach'], slug: 'cybersecurity' },
    { keywords: [' ai ','artificial intelligence','machine learning','chatgpt','gemini ','openai','gpt-4','gpt-5','claude ','llm ','deep learning','neural network','copilot','midjourney','stable diffusion','language model'], slug: 'ai-automation' },
    { keywords: ['iphone ','ipad ','macbook','apple watch','airpods','android phone','samsung galaxy','pixel phone','tablet review','smartwatch','earbuds review','headphone review','drone review'], slug: 'gadgets' },
    { keywords: ['desktop pc','gaming pc','workstation','diy build','graphics card','gpu ','cpu ','processor','ram upgrade','ssd review','pcworld'], slug: 'desktops' },
    { keywords: ['react ','vue ','angular ','svelte','next.js','tailwind','css ','html ','frontend','backend','fullstack','web design','web component'], slug: 'web-development' },
    { keywords: ['how to ','step by step','beginners guide','getting started','tutorial:','walkthrough','tips for '], slug: 'tutorials' },
    { keywords: ['review:','hands-on:','best laptops','best phones','buying guide',' vs ','compared to','tested:','ranking','top 10','top 5'], slug: 'reviews' },
    { keywords: ['startup raises','series a','series b','funding round','ipo filing','acquisition','unicorn','venture capital'], slug: 'digital-business' },
    { keywords: ['kubernetes','docker ','devops','aws ','azure ','google cloud','server setup','vpn service','network infrastructure','cloudflare'], slug: 'networking-it' },
    { keywords: ['javascript','python ','rust lang','golang','typescript','open source','github repo','npm ','programming language','sdk ','api '], slug: 'programming' },
  ]

  for (const rule of overrides) {
    if (rule.keywords.some(k => t.includes(k))) {
      if (catMap[rule.slug]) return catMap[rule.slug]
    }
  }
  return catMap[feedCategory] || catMap['tech-news']
}

export async function GET(req: NextRequest)  { return run(req) }
export async function POST(req: NextRequest) { return run(req) }

async function run(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const url = new URL(req.url)
  const feedLimit = parseInt(url.searchParams.get('limit') || '0', 10) || 0

  // Vercel Hobby serverless timeout is 10s — stop after 8s to return cleanly
  const startedAt = Date.now()
  const DEADLINE_MS = 8000
  function isOutOfTime() { return Date.now() - startedAt >= DEADLINE_MS }

  const supabase = createClient()

  const { data: todayRow } = await supabase
    .from('daily_article_count')
    .select('count')
    .eq('date', new Date().toISOString().slice(0, 10))
    .single()

  const todayCount = todayRow?.count || 0

  if (todayCount >= DAILY_CAP) {
    return NextResponse.json({
      ok:          true,
      message:     `Daily cap of ${DAILY_CAP} reached. Published today: ${todayCount}. Resumes tomorrow at midnight.`,
      ingested:    0,
      cap_reached: true,
    })
  }

  const canPublish = DAILY_CAP - todayCount
  console.log(`[Ingest] Today: ${todayCount}/${DAILY_CAP}. Can publish ${canPublish} more.`)

  const { data: cats } = await supabase.from('categories').select('id, slug')
  const catMap: Record<string, string> = {}
  for (const c of cats || []) catMap[c.slug] = c.id

  const since72h = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('content_fingerprint, source_url, source_urls')
    .gte('published_at', since72h)
    .limit(3000)

  const seenFingerprints = new Set<string>()
  const seenUrls         = new Set<string>()
  for (const p of recentPosts || []) {
    if (p.content_fingerprint) seenFingerprints.add(p.content_fingerprint)
    if (p.source_url)          seenUrls.add(p.source_url)
    for (const u of (p.source_urls || [])) seenUrls.add(u)
  }

  const p1 = RSS_FEEDS.filter(f => f.priority === 1).sort(() => Math.random() - 0.5)
  const p2 = RSS_FEEDS.filter(f => f.priority === 2).sort(() => Math.random() - 0.5)
  const p3 = RSS_FEEDS.filter(f => f.priority === 3).sort(() => Math.random() - 0.5)
  const orderedFeeds = [...p1, ...p2, ...p3]

  let ingested = 0
  let skipped  = 0
  let failed   = 0
  const runFingerprints = new Set<string>()
  const runUrls         = new Set<string>()
  const log: string[]   = []

  let feedIdx = 0
  for (const feed of orderedFeeds) {
    feedIdx++
    if (feedLimit && feedIdx > feedLimit) break

    if (ingested >= canPublish) {
      log.push(`[CAP] Reached ${DAILY_CAP}/day limit, stopping`)
      break
    }

    if (isOutOfTime()) {
      log.push(`[TIME] Deadline approaching, waiting for next run`)
      break
    }

    const items = await parseFeed(feed.url)
    if (!items.length) {
      log.push(`[EMPTY] ${feed.name}`)
      continue
    }

    for (const item of items.slice(0, 10)) {

      if (ingested >= canPublish) break
      if (!item.title || item.title.length < 10) { skipped++; continue }
      if (!item.link.startsWith('http'))          { skipped++; continue }

      if (seenUrls.has(item.link) || runUrls.has(item.link)) {
        skipped++
        continue
      }

      const fp = fingerprint(item.title, item.pubDate)
      if (fp && (seenFingerprints.has(fp) || runFingerprints.has(fp))) {
        skipped++
        log.push(`[DUPE fp] ${item.title.slice(0,50)}`)
        continue
      }

      const sourceText = item.content.length > 80 ? item.content : item.description
      if (!sourceText || sourceText.length < 30) {
        skipped++
        log.push(`[THIN] ${item.title.slice(0,50)}`)
        continue
      }

      try {
        if (isOutOfTime()) {
          log.push(`[TIME] Out of time before processing ${item.title.slice(0, 40)}`)
          break
        }
        const categoryId = autoCategory(item.title, feed.category, catMap)
        const result_ai = await rewriteArticle(item.title, sourceText, feed.name, feed.category, 'rss_auto')
        const ai: BlizineArticle | null = result_ai.article
        const aiDebug = result_ai.debug

        if (!ai) {
          failed++
          log.push(`[AI FAIL] ${item.title.slice(0, 45)} (${aiDebug})`)
          continue
        }

        let finalImage: string | null = null

        if (!finalImage && item.rawImage) {
          finalImage = await validateImageUrl(item.rawImage)
        }

        if (!finalImage) {
          const og = await fetchOgImage(item.link)
          finalImage = await validateImageUrl(og)
        }

        if (!finalImage) {
          const catSlug = Object.entries(catMap).find(([, id]) => id === categoryId)?.[0] || 'tech-news'
          finalImage = CATEGORY_FALLBACKS[catSlug] || CATEGORY_FALLBACKS['tech-news']
        }

        // Upload image to Supabase Storage to prevent hotlink breakage
        try {
          const imgRes = await fetch(finalImage, {
            headers: { 'User-Agent': BOT_UA },
            signal: AbortSignal.timeout(10000),
          })
          if (imgRes.ok) {
            const imgBuf = await imgRes.arrayBuffer()
            const ext = finalImage.includes('.png') ? '.png' : '.jpg'
            const filename = `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
            const { error: upErr } = await supabase.storage
              .from('post-images')
              .upload(filename, Buffer.from(imgBuf), {
                contentType: imgRes.headers.get('content-type') || 'image/jpeg',
                upsert: true,
              })
            if (!upErr) {
              const { data: pub } = supabase.storage.from('post-images').getPublicUrl(filename)
              finalImage = pub.publicUrl
            }
          }
        } catch {}

        const slug = makeSlug(ai.headline)
        const { error: insertError } = await supabase.from('posts').insert({
          slug,
          title:               ai.headline,
          content:             ai.content,
          seo_title:           ai.seoTitle,
          seo_description:     ai.seoDescription,
          seo_keywords:        ai.seoKeywords,
          featured_image:      finalImage,
          author_id:           '3916aa7d-197c-47f8-bdf3-cd6b6f910a37',
          category_id:         categoryId,
          source_name:         feed.name,
          source_url:          item.link,
          source_urls:         [item.link],
          tags:                ai.tags,
          key_points:          ai.keyPoints,
          quick_brief:         ai.quickBrief,
          faq:                 ai.faq,
          blizine_score:       ai.blizineScore,
          is_breaking:         ai.isBreaking,
          is_featured:         false,
          is_editors_pick:     false,
          ai_rewritten:        true,
          model_used:          ai.modelUsed,
          status:              'published',
          content_fingerprint: fp,
          published_at:        new Date(item.pubDate).toISOString(),
          reading_time:        Math.max(2, Math.round(
                                 ai.content.replace(/<[^>]+>/g,' ').split(/\s+/).length / 200
                               )),
          views:               0,
          created_at:          new Date().toISOString(),
          updated_at:          new Date().toISOString(),
        })

        if (insertError) {
          failed++
          log.push(`[DB ERR] ${insertError.message.slice(0,60)}`)
          continue
        }

        await supabase.rpc('increment_daily_count')
        try { await supabase.rpc('increment_rss_feed_count', { p_feed_name: feed.name }) } catch {}

        runUrls.add(item.link)
        if (fp) runFingerprints.add(fp)

        ingested++
        log.push(`[✓ ${ingested}/${canPublish}][gemini-grounded] ${ai.headline.slice(0,60)}`)

        await new Promise(r => setTimeout(r, 1200))

      } catch (err) {
        failed++
        log.push(`[ERR] ${String(err).slice(0,60)}`)
      }
    }
  }

  if (ingested > 0) {
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/revalidate`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.REVALIDATION_SECRET}`,
      },
      body: JSON.stringify({ paths: ['/'] }),
    }).catch(() => {})
  }

  return NextResponse.json({
    ok:            true,
    ingested,
    skipped,
    failed,
    today_total:   todayCount + ingested,
    daily_cap:     DAILY_CAP,
    can_add_more:  canPublish - ingested,
    log:           log.slice(-30),
    timestamp:     new Date().toISOString(),
  })
}
